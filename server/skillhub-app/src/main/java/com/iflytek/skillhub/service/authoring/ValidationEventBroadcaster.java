package com.iflytek.skillhub.service.authoring;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.iflytek.skillhub.domain.authoring.validation.ValidationEvent;
import com.iflytek.skillhub.domain.authoring.validation.ValidationEventType;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.TreeMap;
import java.util.function.Supplier;
import com.iflytek.skillhub.domain.shared.exception.DomainConflictException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * In-memory SSE hub for validation runs. Each subscriber tracks the last sequence
 * number it saw, so replay (Last-Event-ID / afterSeq) and live delivery can be
 * interleaved without duplicates. The hub is per-instance by design: the current
 * deployment runs one backend node, and remote clients always have the polling
 * endpoint as a fallback.
 */
@Component
public class ValidationEventBroadcaster {

    /** SSE connection lifetime cap; clients reconnect with Last-Event-ID on expiry. */
    static final long EMITTER_TIMEOUT_MS = 30L * 60 * 1000;

    private final Map<Long, CopyOnWriteArrayList<EmitterSession>> sessionsByRun = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;

    public ValidationEventBroadcaster(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Registers a live emitter and replays already-persisted events through it. The
     * session cursor makes replay and concurrent live delivery duplicate-free and
     * order-preserving: every send fires only for sequence numbers the session has
     * not delivered yet.
     *
     * @param runId     the run to subscribe to
     * @param lastSeq   the subscriber's last seen sequence number (Last-Event-ID)
     * @param replay    persisted events after {@code lastSeq}, oldest first
     */
    public SseEmitter subscribe(Long runId, int lastSeq, Supplier<List<ValidationEvent>> replay) {
        EmitterSession session = new EmitterSession(lastSeq);
        synchronized (sessionsByRun) {
            int total = sessionsByRun.values().stream().mapToInt(List::size).sum();
            List<EmitterSession> existing = sessionsByRun.get(runId);
            if (total >= 256 || (existing != null && existing.size() >= 16)) {
                throw new DomainConflictException("error.authoring.stream.tooManySubscribers");
            }
            sessionsByRun.computeIfAbsent(runId, key -> new CopyOnWriteArrayList<>()).add(session);
        }
        Runnable detach = () -> detach(runId, session);
        session.emitter().onCompletion(detach);
        session.emitter().onTimeout(detach);
        session.emitter().onError(error -> detach.run());
        try {
            // Registration precedes the DB read; live events buffer until replay ends.
            for (ValidationEvent event : replay.get()) {
                if (!session.accept(event, envelope(event))) {
                    detach.run();
                    return session.emitter();
                }
            }
            if (!session.finishReplay()) {
                detach.run();
            }
        } catch (RuntimeException exception) {
            detach.run();
            session.emitter().complete();
            throw exception;
        }
        return session.emitter();
    }

    public void publish(Long runId, ValidationEvent event) {
        List<EmitterSession> sessions = sessionsByRun.get(runId);
        if (sessions == null) {
            return;
        }
        String envelope = envelope(event);
        for (EmitterSession session : sessions) {
            if (!session.accept(event, envelope)) {
                detach(runId, session);
            }
        }
    }

    public void completeRun(Long runId, ValidationEvent terminalEvent) {
        // The terminal may race replay or a lower live sequence. Only close once
        // every preceding event has actually been delivered.
        publish(runId, terminalEvent);
    }

    private void detach(Long runId, EmitterSession session) {
        synchronized (sessionsByRun) {
            List<EmitterSession> sessions = sessionsByRun.get(runId);
            if (sessions != null) {
                sessions.remove(session);
                if (sessions.isEmpty()) {
                    sessionsByRun.remove(runId);
                }
            }
        }
    }

    private String envelope(ValidationEvent event) {
        Map<String, Object> payload = event.getPayload() == null ? Map.of() : event.getPayload();
        Map<String, Object> envelope = Map.of(
                "seq", event.getSeq(),
                "type", event.getEventType().name(),
                "phase", event.getPhase() == null ? "" : event.getPhase(),
                "payload", payload,
                "createdAt", event.getCreatedAt().toString());
        try {
            return objectMapper.writeValueAsString(envelope);
        } catch (IOException exception) {
            return "{\"seq\":" + event.getSeq() + ",\"type\":\"" + event.getEventType() + "\"}";
        }
    }

    /** One subscriber connection with its own delivery cursor and serialized writes. */
    static final class EmitterSession {
        private final SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MS);
        private final TreeMap<Integer, PendingEvent> pending = new TreeMap<>();
        private int lastSeq;
        private boolean replaying = true;
        private boolean closed;

        EmitterSession(int lastSeq) {
            this.lastSeq = lastSeq;
        }

        SseEmitter emitter() { return emitter; }
        synchronized int lastSeq() { return lastSeq; }

        synchronized boolean accept(ValidationEvent event, String envelope) {
            if (closed) { return false; }
            if (event.getSeq() <= lastSeq) { return true; }
            pending.putIfAbsent(event.getSeq(), new PendingEvent(envelope,
                    event.getEventType() == ValidationEventType.RUN_FINISHED));
            if (pending.size() > 1024) {
                closed = true;
                emitter.complete();
                return false;
            }
            return replaying || drain();
        }

        synchronized boolean finishReplay() {
            replaying = false;
            return drain();
        }

        private boolean drain() {
            while (!closed && pending.containsKey(lastSeq + 1)) {
                PendingEvent event = pending.remove(lastSeq + 1);
                try {
                    emitter.send(SseEmitter.event().id(String.valueOf(lastSeq + 1))
                            .data(event.envelope(), MediaType.APPLICATION_JSON));
                    lastSeq++;
                    if (event.terminal()) {
                        closed = true;
                        pending.clear();
                        emitter.complete();
                        return false;
                    }
                } catch (IOException | IllegalStateException exception) {
                    closed = true;
                    pending.clear();
                    emitter.complete();
                    return false;
                }
            }
            return !closed;
        }

        private record PendingEvent(String envelope, boolean terminal) { }
    }
}

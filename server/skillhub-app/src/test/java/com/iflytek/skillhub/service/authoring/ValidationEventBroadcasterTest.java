package com.iflytek.skillhub.service.authoring;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.iflytek.skillhub.domain.authoring.validation.ValidationEvent;
import com.iflytek.skillhub.domain.authoring.validation.ValidationEventType;
import com.iflytek.skillhub.domain.shared.exception.DomainConflictException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ValidationEventBroadcasterTest {
    @Test
    void replayDoesNotLoseLowerSequencesWhenLiveDeliveryWinsTheRace() {
        ValidationEventBroadcaster.EmitterSession session = new ValidationEventBroadcaster.EmitterSession(0);
        session.accept(event(3, ValidationEventType.PHASE_FINISHED), "live-3");
        session.accept(event(1, ValidationEventType.RUN_STARTED), "replay-1");
        session.accept(event(2, ValidationEventType.PHASE_STARTED), "replay-2");
        assertThat(session.lastSeq()).isZero();
        assertThat(session.finishReplay()).isTrue();
        assertThat(session.lastSeq()).isEqualTo(3);
    }

    @Test
    void outOfOrderTerminalWaitsForTheMissingEvent() {
        ValidationEventBroadcaster.EmitterSession session = new ValidationEventBroadcaster.EmitterSession(0);
        session.finishReplay();
        session.accept(event(2, ValidationEventType.RUN_FINISHED), "terminal");
        assertThat(session.lastSeq()).isZero();
        assertThat(session.accept(event(1, ValidationEventType.RUN_STARTED), "first")).isFalse();
        assertThat(session.lastSeq()).isEqualTo(2);
    }

    @Test
    void registrationPrecedesDatabaseReplayAndTerminalDetachesTheEmptyRun() {
        ValidationEventBroadcaster broadcaster = new ValidationEventBroadcaster(new ObjectMapper());
        broadcaster.subscribe(1L, 0, () -> {
            broadcaster.completeRun(1L, event(2, ValidationEventType.RUN_FINISHED));
            return List.of(event(1, ValidationEventType.RUN_STARTED));
        });
        assertThat((Map<?, ?>) ReflectionTestUtils.getField(broadcaster, "sessionsByRun")).isEmpty();
    }

    @Test
    void subscriberCountAndGapBufferAreBounded() {
        ValidationEventBroadcaster broadcaster = new ValidationEventBroadcaster(new ObjectMapper());
        for (int i = 0; i < 16; i++) { broadcaster.subscribe(1L, 0, List::of); }
        assertThatThrownBy(() -> broadcaster.subscribe(1L, 0, List::of))
                .isInstanceOf(DomainConflictException.class);
        ValidationEventBroadcaster.EmitterSession session = new ValidationEventBroadcaster.EmitterSession(0);
        for (int seq = 2; seq <= 1025; seq++) {
            assertThat(session.accept(event(seq, ValidationEventType.FINDING), "gap")).isTrue();
        }
        assertThat(session.accept(event(1026, ValidationEventType.FINDING), "overflow")).isFalse();
    }

    private static ValidationEvent event(int seq, ValidationEventType type) {
        ValidationEvent event = new ValidationEvent(1L, seq, type, null, Map.of());
        ReflectionTestUtils.setField(event, "createdAt", Instant.EPOCH);
        return event;
    }
}

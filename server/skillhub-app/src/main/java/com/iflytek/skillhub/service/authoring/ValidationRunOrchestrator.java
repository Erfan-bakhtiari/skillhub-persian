package com.iflytek.skillhub.service.authoring;

import com.iflytek.skillhub.config.AuthoringProperties;
import com.iflytek.skillhub.domain.authoring.service.DraftStructureValidator;
import com.iflytek.skillhub.domain.authoring.service.SkillDraftService;
import com.iflytek.skillhub.domain.authoring.service.ValidationRunService;
import com.iflytek.skillhub.domain.authoring.validation.FindingDraft;
import com.iflytek.skillhub.domain.authoring.validation.FindingSeverity;
import com.iflytek.skillhub.domain.authoring.validation.ValidationEvent;
import com.iflytek.skillhub.domain.authoring.validation.ValidationEventType;
import com.iflytek.skillhub.domain.authoring.validation.ValidationFinding;
import com.iflytek.skillhub.domain.authoring.validation.ValidationLayer;
import com.iflytek.skillhub.domain.authoring.validation.ValidationRun;
import com.iflytek.skillhub.domain.authoring.validation.ValidationRunStatus;
import com.iflytek.skillhub.domain.shared.exception.DomainConflictException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executor;
import java.util.concurrent.FutureTask;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.RejectedExecutionException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

/**
 * Executes validation runs for skill drafts. This layer runs the STRUCTURE
 * phase: package layout, SKILL.md frontmatter and file limits, reported as
 * structured findings with fix suggestions. The CONFIG and BEHAVIOR phases
 * (runtime binding, MCP probing, script/LLM task execution) arrive with the
 * runtime layer.
 */
@Service
public class ValidationRunOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(ValidationRunOrchestrator.class);
    private static final int MAX_EVENT_TEXT = 4_000;

    private final ValidationRunService runService;
    private final SkillDraftService draftService;
    private final DraftStructureValidator structureValidator;
    private final ValidationEventBroadcaster broadcaster;
    private final Executor executor;

    private final ScheduledExecutorService timer;
    private final AuthoringProperties properties;
    private final Map<Long, FutureTask<Void>> tasks = new ConcurrentHashMap<>();

    public ValidationRunOrchestrator(ValidationRunService runService,
                                     SkillDraftService draftService,
                                     DraftStructureValidator structureValidator,
                                     ValidationEventBroadcaster broadcaster,
                                     @Qualifier("authoringValidationExecutor") Executor executor,
                                     @Qualifier("authoringValidationTimer") ScheduledExecutorService timer,
                                     AuthoringProperties properties) {
        this.runService = runService;
        this.draftService = draftService;
        this.structureValidator = structureValidator;
        this.broadcaster = broadcaster;
        this.executor = executor;
        this.timer = timer;
        this.properties = properties;
    }

    /** Enqueues one QUEUED run for execution. */
    public void submit(Long runId) {
        FutureTask<Void> task = new FutureTask<>(() -> { executeRun(runId); return null; }) {
            @Override protected void done() { tasks.remove(runId, this); }
        };
        if (tasks.putIfAbsent(runId, task) != null) {
            return;
        }
        try {
            executor.execute(task);
        } catch (RejectedExecutionException exception) {
            tasks.remove(runId, task);
            // The run was persisted before enqueue. Settle rather than leave it QUEUED.
            runService.settleIfQueued(runId, 1, 0,
                    Map.of("reason", "validation executor is busy; start a new run"));
            emitTerminalOnce(runId);
        }
    }

    /**
     * Settles cancellation immediately, fences further writes, then interrupts
     * the local worker cooperatively. Interrupt-insensitive work may still finish computing.
     */
    public ValidationRun requestCancel(Long runId, String userId, Set<String> platformRoles) {
        ValidationRun run = runService.requestCancel(runId, userId, platformRoles);
        if (run.isActive()) {
            settle(runId, ValidationRunStatus.CANCELLED, run.getErrorCount(), run.getWarningCount(),
                    Map.of("reason", "cancelled by user"));
            run = runService.getRun(runId);
        } else {
            emitTerminalOnce(runId);
        }
        FutureTask<Void> task = tasks.get(runId);
        if (task != null) { task.cancel(true); }
        return run;
    }

    /**
     * Idempotent terminal settle: persists the outcome (first writer wins), appends the
     * RUN_FINISHED event exactly once, and completes SSE subscribers.
     */
    public void settle(Long runId, ValidationRunStatus status, int errorCount, int warningCount,
                       Map<String, Object> summary) {
        runService.settleIfActive(runId, status, errorCount, warningCount, summary);
        emitTerminalOnce(runId);
        if (status == ValidationRunStatus.TIMED_OUT) {
            FutureTask<Void> task = tasks.get(runId);
            if (task != null) { task.cancel(true); }
        }
    }

    // ---------------------------------------------------------------- execution

    private void executeRun(Long runId) {
        ScheduledFuture<?> deadline = null;
        boolean claimed = false;
        try {
            ValidationRun run = runService.claimForExecution(runId);
            if (run.getStatus().isTerminal()) {
                emitTerminalOnce(runId);
                return;
            }
            claimed = true;
            deadline = timer.schedule(() -> {
                try {
                    settle(runId, ValidationRunStatus.TIMED_OUT, 0, 0,
                            Map.of("reason", "validation execution deadline exceeded"));
                } catch (RuntimeException exception) {
                    log.error("Could not settle validation deadline for run {}", runId, exception);
                }
            }, Math.max(1, properties.getRunTimeoutMs()), TimeUnit.MILLISECONDS);
            executePipeline(run);
        } catch (DomainConflictException exception) {
            if (claimed) {
                settle(runId, ValidationRunStatus.FAILED, 1, 0,
                        Map.of("reason", "draft revision changed or run already settled"));
            } else {
                // Duplicate submit cannot append a fake terminal to another active worker.
                emitTerminalOnce(runId);
            }
        } catch (Exception exception) {
            log.error("Validation run {} crashed", runId, exception);
            settle(runId, ValidationRunStatus.FAILED, 1, 0,
                    Map.of("internalError", truncate(String.valueOf(exception.getMessage()), 500)));
        } finally {
            if (deadline != null) { deadline.cancel(false); }
        }
    }

    private void executePipeline(ValidationRun run) {
        Long runId = run.getId();
        SkillDraftService.MaterializedSnapshot snapshot =
                draftService.materializeSnapshot(run.getDraftId(), run.getDraftRevision());
        RunContext context = new RunContext(runId);

        emit(runId, ValidationEventType.RUN_STARTED, null, Map.of(
                "draftId", run.getDraftId(),
                "draftName", snapshot.name(),
                "draftRevision", run.getDraftRevision()));

        try {
            // ---- STRUCTURE layer
            emit(runId, ValidationEventType.PHASE_STARTED, "STRUCTURE", Map.of());
            DraftStructureValidator.StructureReport structure =
                    structureValidator.validate(snapshot.name(), snapshot.requirement(), snapshot.entries());
            structure.findings().forEach(context::recordFinding);
            emit(runId, ValidationEventType.PHASE_FINISHED, "STRUCTURE", Map.of(
                    "findings", structure.findings().size(),
                    "errors", context.errorCount(ValidationLayer.STRUCTURE),
                    "warnings", context.warningCount(ValidationLayer.STRUCTURE)));

            settle(runId,
                    context.errorCount == 0 ? ValidationRunStatus.SUCCEEDED : ValidationRunStatus.FAILED,
                    context.errorCount, context.warningCount, summary(context));
        } catch (DomainConflictException exception) {
            throw exception;
        } catch (Exception exception) {
            log.error("Validation pipeline for run {} failed", runId, exception);
            settle(runId, ValidationRunStatus.FAILED, context.errorCount + 1, context.warningCount,
                    Map.of("internalError", truncate(String.valueOf(exception.getMessage()), 500)));
        }
    }

    // ---------------------------------------------------------------- events

    private void emit(Long runId, ValidationEventType type, String phase, Map<String, Object> payload) {
        ValidationEvent event = runService.appendEvent(runId, type, phase, payload);
        broadcaster.publish(runId, event);
    }

    /** Appends the RUN_FINISHED event exactly once per run, then completes SSE subscribers. */
    private void emitTerminalOnce(Long runId) {
        ValidationEvent terminal = runService.appendTerminalEvent(runId);
        if (terminal != null) {
            broadcaster.completeRun(runId, terminal);
        }
    }

    // ---------------------------------------------------------------- small helpers

    private Map<String, Object> summary(RunContext context) {
        Map<String, Object> summary = new java.util.LinkedHashMap<>();
        summary.put("structureErrors", context.errorCount(ValidationLayer.STRUCTURE));
        summary.put("structureWarnings", context.warningCount(ValidationLayer.STRUCTURE));
        summary.put("errorCount", context.errorCount);
        summary.put("warningCount", context.warningCount);
        return summary;
    }

    private static String truncate(String value, int limit) {
        if (value == null) {
            return "";
        }
        return value.length() <= limit ? value : value.substring(0, limit) + "…";
    }

    /** Per-run finding bookkeeping; each finding is persisted and emitted as an event. */
    private final class RunContext {

        private final Long runId;
        private final List<FindingDraft> findings = new ArrayList<>();
        private int errorCount;
        private int warningCount;

        RunContext(Long runId) {
            this.runId = runId;
        }

        int errorCount(ValidationLayer layer) {
            return (int) findings.stream()
                    .filter(finding -> finding.layer() == layer
                            && finding.severity() == FindingSeverity.ERROR)
                    .count();
        }

        int warningCount(ValidationLayer layer) {
            return (int) findings.stream()
                    .filter(finding -> finding.layer() == layer
                            && finding.severity() == FindingSeverity.WARNING)
                    .count();
        }

        void recordFinding(FindingDraft draft) {
            findings.add(draft);
            if (draft.severity() == FindingSeverity.ERROR) {
                errorCount++;
            } else if (draft.severity() == FindingSeverity.WARNING) {
                warningCount++;
            }
            ValidationFinding persisted = runService.recordFinding(runId, draft);
            emit(runId, ValidationEventType.FINDING, draft.layer().name(), Map.of(
                    "findingId", persisted.getId(),
                    "layer", draft.layer().name(),
                    "ruleCode", draft.ruleCode(),
                    "severity", draft.severity().name(),
                    "filePath", draft.filePath() == null ? "" : draft.filePath(),
                    "message", truncate(draft.message(), MAX_EVENT_TEXT),
                    "hasSuggestion", draft.suggestion() != null));
        }
    }
}

package com.iflytek.skillhub.domain.authoring.service;

import com.iflytek.skillhub.domain.authoring.DraftFile;
import com.iflytek.skillhub.domain.authoring.SkillDraft;
import com.iflytek.skillhub.domain.authoring.validation.ValidationRun;
import com.iflytek.skillhub.domain.authoring.validation.ValidationRunStatus;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** Mutable authoring rules are guarded in code rather than migration CHECK constraints. */
class AuthoringEntityValidationTest {

    @Test
    void invalidRevisionDoesNotChangeDraftContent() {
        SkillDraft draft = new SkillDraft(1L, "owner", "draft", null, "original");
        assertThrows(IllegalArgumentException.class, () -> draft.applyContentChange(0, "invalid"));
        assertThat(draft.getRevision()).isEqualTo(1);
        assertThat(draft.getContentDigest()).isEqualTo("original");
    }

    @Test
    void negativeFileSizeIsRejectedOnConstructionAndUpdate() {
        assertThrows(IllegalArgumentException.class,
                () -> new DraftFile(1L, "SKILL.md", "hash", -1L, "text/markdown", "key"));
        DraftFile file = new DraftFile(1L, "SKILL.md", "hash", 0L, "text/markdown", "key");
        assertThrows(IllegalArgumentException.class,
                () -> file.updateContent("new-hash", -1L, "text/markdown", "new-key"));
        assertThat(file.getSize()).isZero();
        assertThat(file.getSha256()).isEqualTo("hash");
        assertThat(file.getStorageKey()).isEqualTo("key");
    }

    @Test
    void invalidFindingCountsCannotSettleRun() {
        ValidationRun run = new ValidationRun(1L, 1, "owner");
        assertThrows(IllegalArgumentException.class, () -> run.finish(
                ValidationRunStatus.FAILED, -1, 0, Map.of(), Instant.now()));
        assertThrows(IllegalArgumentException.class, () -> run.finish(
                ValidationRunStatus.FAILED, 0, -1, Map.of(), Instant.now()));
        assertThat(run.getStatus()).isEqualTo(ValidationRunStatus.QUEUED);
        assertThat(run.getFinishedAt()).isNull();
    }
}

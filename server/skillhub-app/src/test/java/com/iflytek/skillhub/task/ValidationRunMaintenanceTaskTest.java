package com.iflytek.skillhub.task;

import com.iflytek.skillhub.config.AuthoringProperties;
import com.iflytek.skillhub.domain.authoring.service.ValidationRunService;
import com.iflytek.skillhub.domain.shared.exception.DomainNotFoundException;
import com.iflytek.skillhub.service.authoring.ValidationRunOrchestrator;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ValidationRunMaintenanceTaskTest {
    @TempDir Path root;

    @Test
    void databaseFailureRetainsWorkspaceButConfirmedMissingRunDeletesIt() throws Exception {
        Path unavailable = Files.createDirectory(root.resolve("run-1"));
        Path missing = Files.createDirectory(root.resolve("run-2"));
        Files.writeString(unavailable.resolve("input.md"), "retained");
        Files.writeString(missing.resolve("input.md"), "orphan");
        ValidationRunService runs = mock(ValidationRunService.class);
        when(runs.findActiveRunsCreatedBefore(any())).thenReturn(List.of());
        when(runs.getRun(1L)).thenThrow(new IllegalStateException("database unavailable"));
        when(runs.getRun(2L)).thenThrow(new DomainNotFoundException("missing"));
        AuthoringProperties properties = new AuthoringProperties();
        properties.setWorkspaceRoot(root.toString());
        new ValidationRunMaintenanceTask(runs, mock(ValidationRunOrchestrator.class), properties).sweep();
        assertThat(unavailable.resolve("input.md")).exists();
        assertThat(missing).doesNotExist();
    }
}

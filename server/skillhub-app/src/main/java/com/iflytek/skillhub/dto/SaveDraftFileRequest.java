package com.iflytek.skillhub.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * Request body for saving one draft file. Text is the default encoding; base64
 * transports binary-safe content.
 */
public record SaveDraftFileRequest(
        @NotBlank(message = "{error.badRequest}") String path,
        @NotNull(message = "{error.badRequest}") String content,
        @Pattern(regexp = "(?i)(text|base64)", message = "{error.badRequest}") String encoding,
        String contentType,
        Integer expectedRevision
) {

    public boolean isBase64() {
        return "base64".equalsIgnoreCase(encoding);
    }
}

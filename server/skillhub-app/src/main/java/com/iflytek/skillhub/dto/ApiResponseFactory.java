package com.iflytek.skillhub.dto;

import com.iflytek.skillhub.observability.RequestIdAccessor;
import com.iflytek.skillhub.exception.PackageDiagnosticLocalizer;
import java.util.Collection;
import java.util.Set;
import java.util.Arrays;
import java.util.stream.Collectors;
import org.springframework.context.MessageSource;
import org.springframework.stereotype.Component;
import org.springframework.context.i18n.LocaleContextHolder;

import java.time.Clock;
import java.time.Instant;

@Component
public class ApiResponseFactory {

    private final MessageSource messageSource;
    private final Clock clock;
    private final RequestIdAccessor requestIdAccessor;

    public ApiResponseFactory(MessageSource messageSource,
                              Clock clock,
                              RequestIdAccessor requestIdAccessor) {
        this.messageSource = messageSource;
        this.clock = clock;
        this.requestIdAccessor = requestIdAccessor;
    }

    public <T> ApiResponse<T> ok(String messageCode, T data, Object... args) {
        String msg = messageSource.getMessage(messageCode, args, messageCode, LocaleContextHolder.getLocale());
        return new ApiResponse<>(0, msg, data, Instant.now(clock), requestIdAccessor.current());
    }

    public ApiResponse<Void> error(int code, String messageCode, Object... args) {
        if (Set.of("error.skill.publish.package.invalid", "error.skill.publish.precheck.failed",
                "error.skill.publish.precheck.confirmRequired", "error.skill.metadata.compliance.invalid").contains(messageCode)) {
            boolean warnings = "error.skill.publish.precheck.confirmRequired".equals(messageCode);
            args = Arrays.stream(args).map(arg -> arg instanceof Collection<?> values
                    ? values.stream().map(String::valueOf)
                        .map(value -> PackageDiagnosticLocalizer.localize(value, messageSource, LocaleContextHolder.getLocale()))
                        .map(value -> warnings ? "- " + value : value)
                        .collect(Collectors.joining(warnings ? "\n" : ", "))
                    : arg).toArray();
        }
        String msg = messageSource.getMessage(messageCode, args, messageCode, LocaleContextHolder.getLocale());
        return new ApiResponse<>(code, msg, null, Instant.now(clock), requestIdAccessor.current());
    }

    public ApiResponse<Void> errorMessage(int code, String msg) {
        return new ApiResponse<>(code, msg, null, Instant.now(clock), requestIdAccessor.current());
    }
}

package com.iflytek.skillhub.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.iflytek.skillhub.domain.idempotency.IdempotencyRecord;
import com.iflytek.skillhub.domain.idempotency.IdempotencyRecordRepository;
import com.iflytek.skillhub.domain.idempotency.IdempotencyStatus;
import com.iflytek.skillhub.observability.RequestIdAccessor;
import com.iflytek.skillhub.dto.ApiResponseFactory;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IdempotencyInterceptorTest {

    @Mock
    private IdempotencyRecordRepository idempotencyRecordRepository;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;
    @Mock
    private RequestIdAccessor requestIdAccessor;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    private IdempotencyInterceptor interceptor;
    private Clock clock;

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        clock = Clock.fixed(Instant.parse("2026-03-18T00:00:00Z"), ZoneOffset.UTC);
        var messages = new ResourceBundleMessageSource();
        messages.setBasename("messages");
        messages.setDefaultEncoding("UTF-8");
        messages.setFallbackToSystemLocale(false);
        interceptor = new IdempotencyInterceptor(
                redisTemplate,
                idempotencyRecordRepository,
                objectMapper,
                clock,
                requestIdAccessor,
                new ApiResponseFactory(messages, clock, requestIdAccessor)
        );
    }

    @AfterEach
    void resetLocale() {
        LocaleContextHolder.resetLocaleContext();
    }

    @Test
    void testNewRequestPassesThrough() throws Exception {
        when(request.getMethod()).thenReturn("POST");
        when(request.getHeader("X-Request-Id")).thenReturn("req-123");
        when(requestIdAccessor.current()).thenReturn("req-123");
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("idempotency:req-123")).thenReturn(null);
        when(idempotencyRecordRepository.findByRequestId("req-123")).thenReturn(Optional.empty());

        boolean result = interceptor.preHandle(request, response, new Object());

        assertTrue(result);
        verify(idempotencyRecordRepository).save(any(IdempotencyRecord.class));
    }

    @Test
    void testProvidedInvalidHeaderUsesEffectiveRequestContext() throws Exception {
        when(request.getMethod()).thenReturn("POST");
        when(request.getHeader("X-Request-Id")).thenReturn("invalid request id");
        when(requestIdAccessor.current()).thenReturn("generated-valid-id");
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("idempotency:generated-valid-id")).thenReturn(null);
        when(idempotencyRecordRepository.findByRequestId("generated-valid-id"))
                .thenReturn(Optional.empty());

        boolean result = interceptor.preHandle(request, response, new Object());

        assertTrue(result);
        verify(idempotencyRecordRepository).findByRequestId("generated-valid-id");
        verify(idempotencyRecordRepository, never()).findByRequestId("invalid request id");
    }

    @ParameterizedTest
    @CsvSource({"en,This request has already been processed", "fa-IR,این درخواست قبلاً پردازش شده است"})
    void testDuplicateRequestReturnsCachedResponse(String language, String message) throws Exception {
        LocaleContextHolder.setLocale(Locale.forLanguageTag(language));
        when(request.getMethod()).thenReturn("POST");
        when(request.getHeader("X-Request-Id")).thenReturn("req-456");
        when(requestIdAccessor.current()).thenReturn("req-456");
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get("idempotency:req-456")).thenReturn("COMPLETED");

        StringWriter stringWriter = new StringWriter();
        PrintWriter writer = new PrintWriter(stringWriter);
        when(response.getWriter()).thenReturn(writer);

        boolean result = interceptor.preHandle(request, response, new Object());

        assertFalse(result);
        writer.flush();
        String output = stringWriter.toString();
        var body = new ObjectMapper().readTree(output);
        assertEquals(message, body.get("msg").asText());
        assertEquals(409, body.get("code").asInt());
        assertEquals("req-456", body.get("requestId").asText());
    }

    @Test
    void testNoRequestIdHeaderPassesThrough() throws Exception {
        when(request.getMethod()).thenReturn("POST");
        when(request.getHeader("X-Request-Id")).thenReturn(null);

        boolean result = interceptor.preHandle(request, response, new Object());

        assertTrue(result);
        verify(idempotencyRecordRepository, never()).findByRequestId(anyString());
    }

    @Test
    void testGetRequestPassesThrough() throws Exception {
        when(request.getMethod()).thenReturn("GET");

        boolean result = interceptor.preHandle(request, response, new Object());

        assertTrue(result);
        verify(redisTemplate, never()).opsForValue();
    }

    @Test
    void testAfterCompletionUpdatesRecord() throws Exception {
        when(request.getMethod()).thenReturn("POST");
        when(request.getHeader("X-Request-Id")).thenReturn("req-789");
        when(requestIdAccessor.current()).thenReturn("req-789");
        when(response.getStatus()).thenReturn(200);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        IdempotencyRecord record = new IdempotencyRecord(
            "req-789", (String) null, (Long) null, IdempotencyStatus.PROCESSING, (Integer) null,
            Instant.now(clock), Instant.now(clock).plusSeconds(86400)
        );
        when(idempotencyRecordRepository.findByRequestId("req-789")).thenReturn(Optional.of(record));

        interceptor.afterCompletion(request, response, new Object(), null);

        verify(idempotencyRecordRepository).save(any(IdempotencyRecord.class));
        verify(valueOperations).set(eq("idempotency:req-789"), eq("COMPLETED"), anyLong(), any(TimeUnit.class));
    }
}

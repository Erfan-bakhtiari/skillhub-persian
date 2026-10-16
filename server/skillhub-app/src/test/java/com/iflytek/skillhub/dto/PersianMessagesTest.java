package com.iflytek.skillhub.dto;

import com.iflytek.skillhub.observability.RequestIdAccessor;
import com.iflytek.skillhub.controller.HealthController;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Clock;
import java.util.Locale;
import java.util.Properties;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.text.MessageFormat;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PersianMessagesTest {

    @Test
    void coversEveryBaseMessageWithValidPersianFormattingAndTheSameArguments() throws Exception {
        var base = new Properties();
        var persian = new Properties();
        try (var reader = new InputStreamReader(getClass().getResourceAsStream("/messages.properties"), StandardCharsets.UTF_8)) {
            base.load(reader);
        }
        try (var reader = new InputStreamReader(getClass().getResourceAsStream("/messages_fa.properties"), StandardCharsets.UTF_8)) {
            persian.load(reader);
        }
        assertThat(persian.keySet()).isEqualTo(base.keySet());
        var argumentPattern = Pattern.compile("\\{(\\d+)(?:,[^}]*)?}");
        for (String key : base.stringPropertyNames()) {
            var sourceArguments = argumentPattern.matcher(base.getProperty(key)).results().map(match -> match.group(1)).sorted().toList();
            var translatedArguments = argumentPattern.matcher(persian.getProperty(key)).results().map(match -> match.group(1)).sorted().toList();
            assertThat(translatedArguments).as(key).isEqualTo(sourceArguments);
            var format = new MessageFormat(persian.getProperty(key), Locale.forLanguageTag("fa-IR"));
            Object[] arguments = new Object[format.getFormatsByArgumentIndex().length];
            for (int index = 0; index < arguments.length; index++) arguments[index] = "technical-" + index;
            String message = format.format(arguments);
            assertThat(message).as(key).isNotBlank();
            for (String index : translatedArguments) assertThat(message).as(key).contains("technical-" + index);
        }
    }

    private ApiResponseFactory responseFactory() {
        ResourceBundleMessageSource messages = new ResourceBundleMessageSource();
        messages.setBasename("messages");
        messages.setDefaultEncoding("UTF-8");
        messages.setFallbackToSystemLocale(false);
        return new ApiResponseFactory(messages, Clock.systemUTC(), mock(RequestIdAccessor.class));
    }

    @Test
    void negotiatesPersianFromTheRequestHeaderWithoutChangingResponseData() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new HealthController(responseFactory())).build();
        for (String language : new String[]{"fa", "fa-IR"}) {
            mvc.perform(get("/api/v1/health").header("Accept-Language", language))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.msg").value("سرویس در دسترس است"))
                    .andExpect(jsonPath("$.data.message").value("UP"));
        }
        mvc.perform(get("/api/v1/health").header("Accept-Language", "en"))
                .andExpect(jsonPath("$.msg").value("Service is up"));
    }

    @AfterEach
    void clearLocale() {
        LocaleContextHolder.resetLocaleContext();
    }

    @Test
    void resolvesAuthenticationFailuresAndPreservesTheResetPrivacyMessage() {
        LocaleContextHolder.setLocale(Locale.forLanguageTag("fa-IR"));
        var factory = responseFactory();
        assertThat(factory.error(401, "error.auth.local.invalidCredentials").msg())
                .isEqualTo("نام کاربری یا رمز عبور نادرست است");
        assertThat(factory.error(409, "error.auth.local.username.exists").msg())
                .isEqualTo("نام کاربری از قبل وجود دارد");
        assertThat(factory.error(400, "error.auth.password.reset.invalid.code").msg())
                .isEqualTo("کد تأیید معتبر نیست یا منقضی شده است.");
        assertThat(factory.error(429, "error.auth.local.locked", "5").msg())
                .isEqualTo("تلاش‌های ناموفق بیش از حد بود. 5 دقیقهٔ دیگر دوباره تلاش کنید");
        assertThat(factory.ok("response.auth.password.reset.requested", null).msg())
                .isEqualTo("اگر حساب واجد شرایط باشد، کد تأیید بازیابی رمز برای آن ارسال شده است.");
    }

    @Test
    void resolvesRegionalPersianMessagesAndPreservesTechnicalArgumentsInApiResponses() {
        ResourceBundleMessageSource messages = new ResourceBundleMessageSource();
        messages.setBasename("messages");
        messages.setDefaultEncoding("UTF-8");
        messages.setFallbackToSystemLocale(false);
        ApiResponseFactory factory = new ApiResponseFactory(messages, Clock.systemUTC(), mock(RequestIdAccessor.class));

        LocaleContextHolder.setLocale(Locale.forLanguageTag("fa-IR"));
        assertThat(factory.ok("response.success.read", "data").msg()).isEqualTo("اطلاعات دریافت شد");
        assertThat(factory.error(404, "error.skill.notFound", "@global/test-1.2.3").msg())
                .isEqualTo("skill پیدا نشد: @global/test-1.2.3");

        assertThat(messages.getMessage("error.skill.version.exists", new Object[]{"1.2.3"}, Locale.forLanguageTag("fa")))
                .isEqualTo("این نسخه از قبل وجود دارد: 1.2.3");
        assertThat(messages.getMessage("mail.passwordReset.subject", null, Locale.forLanguageTag("fa-IR")))
                .isEqualTo("کد تأیید بازیابی رمز عبور SkillHub");
        assertThat(messages.getMessage("mail.passwordReset.body", new Object[]{"001234", 10L}, Locale.forLanguageTag("fa-IR")))
                .contains("\n\n001234\n\n", "دقیقه", "نادیده بگیرید")
                .doesNotContain("۰۰۱۲۳۴");
        assertThat(messages.getMessage("mail.passwordReset.subject", null, Locale.forLanguageTag("de")))
                .isEqualTo("SkillHub password reset verification code");
        LocaleContextHolder.setLocale(Locale.ENGLISH);
        assertThat(factory.ok("response.success.read", "data").msg()).isEqualTo("Fetched successfully");
    }
}

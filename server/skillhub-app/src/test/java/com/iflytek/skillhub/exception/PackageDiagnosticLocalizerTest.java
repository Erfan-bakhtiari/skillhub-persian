package com.iflytek.skillhub.exception;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.iflytek.skillhub.domain.skill.metadata.SkillMetadataParser;
import com.iflytek.skillhub.domain.skill.validation.BasicPrePublishValidator;
import com.iflytek.skillhub.domain.skill.validation.PackageEntry;
import com.iflytek.skillhub.domain.skill.validation.PrePublishValidator;
import com.iflytek.skillhub.domain.skill.validation.SkillPackageValidator;
import com.iflytek.skillhub.dto.ApiResponseFactory;
import com.iflytek.skillhub.observability.RequestIdAccessor;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.List;
import java.util.Locale;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import com.iflytek.skillhub.domain.shared.exception.DomainBadRequestException;
import com.iflytek.skillhub.metrics.SkillHubMetrics;
import com.iflytek.skillhub.security.SensitiveLogSanitizer;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PackageDiagnosticLocalizerTest {
    private final Locale persian = Locale.forLanguageTag("fa-IR");
    private final ResourceBundleMessageSource messages = messages();

    private static ResourceBundleMessageSource messages() {
        var source = new ResourceBundleMessageSource();
        source.setBasename("messages");
        source.setDefaultEncoding("UTF-8");
        source.setFallbackToSystemLocale(false);
        return source;
    }

    @AfterEach
    void resetLocale() {
        LocaleContextHolder.resetLocaleContext();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "Missing required file: SKILL.md at root",
            "Duplicate package entry path: فایل, name:{0}.py",
            "Disallowed file extension: path/a.exe",
            "File content does not match extension: image.png",
            "Package entry path is missing",
            "Package entry path is empty",
            "Package entry path must be relative: /root/a.py",
            "Package entry path contains an invalid drive or scheme prefix: C:/a.py",
            "Package entry path is invalid: ../a.py",
            "Package entry path escapes package root: ../a.py",
            "Package entry path must be normalized: a/../b.py",
            "Too many files: 501 (max: 500)",
            "File too large: files/a, b.py (1000 bytes, max: 500)",
            "Package too large: 2000 bytes (max: 1000)",
            "Invalid SKILL.md frontmatter: missing required field \"name\"",
            "Invalid SKILL.md frontmatter: missing opening --- marker",
            "Invalid SKILL.md frontmatter: missing closing --- marker",
            "Invalid SKILL.md frontmatter: frontmatter is empty",
            "Invalid SKILL.md frontmatter: frontmatter must be a YAML object",
            "Invalid SKILL.md frontmatter: invalid YAML near line 12, column 3. If a value contains a colon, wrap it in quotes.",
            "Invalid SKILL.md frontmatter: invalid YAML syntax",
            "config.py line 17 contains a value that looks like a cloud access key. Replace real credentials with placeholders before publishing.",
            "config.py line 17 contains a value that looks like a GitHub token. Replace real credentials with placeholders before publishing.",
            "config.py line 17 contains a value that looks like a API key. Replace real credentials with placeholders before publishing.",
            "config.py line 17 contains a value that looks like a secret or token. Replace real credentials with placeholders before publishing.",
            "Namespace not found: my-team",
            "Namespace is frozen: my-team",
            "Namespace is archived: my-team",
            "Publisher is not a member of namespace: my-team",
            "Cannot publish to archived skill: my-skill",
            "Version already published: 1.2.3",
            "Name conflict: slug \"my-skill\" is already published by another user",
            "x-astron-compliance must be an array",
            "x-astron-compliance must contain at most 32 items",
            "x-astron-compliance[0] must be an object",
            "x-astron-compliance[0].standard has an invalid format",
            "x-astron-compliance contains duplicate mapping mitre/v1/T1059",
            "x-astron-compliance[0].evidence must be an array",
            "x-astron-compliance[0].evidence must contain at most 10 items",
            "x-astron-compliance[0].evidence[0] must be an object",
            "x-astron-compliance[0].evidence[0].type must be one of packaged-file, external-url",
            "x-astron-compliance[0].evidence[0].path does not exist in package: refs/a.md",
            "x-astron-compliance[0].evidence[0].path Package entry path escapes package root: ../a.md",
            "x-astron-compliance[0].evidence[0].url must be an http or https URL",
            "x-astron-compliance[0].title is required",
            "x-astron-compliance[0].title must be at most 128 characters",
            "x-astron-compliance[0].title must be a non-empty string",
            "x-astron-compliance[0].evidence[0].custom-field is not allowed",
            "Invalid skill name for slug generation: error.skill.metadata.name.invalid"
    })
    void knownDiagnosticsTranslateOnlyInPersian(String diagnostic) {
        String translated = PackageDiagnosticLocalizer.localize(diagnostic, messages, persian);
        assertThat(translated).containsPattern("[\\u0600-\\u06FF]").isNotEqualTo(diagnostic);
        for (Locale locale : List.of(Locale.ENGLISH, Locale.CHINESE, Locale.forLanguageTag("ru"))) {
            assertThat(PackageDiagnosticLocalizer.localize(diagnostic, messages, locale)).isEqualTo(diagnostic);
        }
    }

    @Test
    void keepsOpaqueValuesAndUnknownDiagnosticsWithoutGuessing() {
        String path = "folder/a, Duplicate package entry path: ب'{0}.py";
        assertThat(PackageDiagnosticLocalizer.localize("Disallowed file extension: " + path, messages, persian))
                .isEqualTo("پسوند فایل مجاز نیست: " + path);
        assertThat(PackageDiagnosticLocalizer.localize("Plugin says: do not change {0}", messages, persian))
                .isEqualTo("Plugin says: do not change {0}");
        assertThat(PackageDiagnosticLocalizer.localize("error.slug.length", messages, persian))
                .isEqualTo("error.slug.length");
        assertThat(PackageDiagnosticLocalizer.localize("error.slug.reserved", messages, persian))
                .isEqualTo("error.slug.reserved");
    }

    @Test
    void responseFormatsEachDiagnosticSeparatelyWithoutSplittingAFileName() {
        var factory = new ApiResponseFactory(messages, Clock.systemUTC(), mock(RequestIdAccessor.class));
        List<String> warnings = List.of("Disallowed file extension: a, b.exe",
                "File content does not match extension: c.png");
        LocaleContextHolder.setLocale(persian);
        var response = factory.error(400, "error.skill.publish.precheck.confirmRequired", warnings);
        assertThat(response.msg()).contains("\n- پسوند فایل مجاز نیست: a, b.exe",
                "\n- محتوای فایل با پسوند آن سازگار نیست: c.png");
        assertThat(response.code()).isEqualTo(400);
        LocaleContextHolder.setLocale(Locale.ENGLISH);
        assertThat(factory.error(400, "error.skill.publish.precheck.confirmRequired", warnings).msg())
                .contains("\n- Disallowed file extension: a, b.exe\n- File content does not match extension: c.png");
    }

    @Test
    void translatesActualValidatorOutputAndNeverIncludesTheCredentialValue() {
        var validator = new SkillPackageValidator(new SkillMetadataParser());
        var broken = validator.validate(List.of(new PackageEntry("malware.exe", new byte[0], 0, null)));
        assertThat(broken.errors()).containsExactly("Missing required file: SKILL.md at root");
        assertThat(PackageDiagnosticLocalizer.localize(broken.errors().getFirst(), messages, persian))
                .isEqualTo("فایل الزامی SKILL.md در ریشهٔ بسته وجود ندارد");
        String credential = "ghp_" + "A".repeat(30);
        byte[] content = ("token = \"" + credential + "\"").getBytes(StandardCharsets.UTF_8);
        var result = new BasicPrePublishValidator().validate(new PrePublishValidator.SkillPackageContext(
                List.of(new PackageEntry("config.py", content, content.length, "text/plain")), null, "user", 1L));
        assertThat(result.warnings()).hasSize(1);
        String localized = PackageDiagnosticLocalizer.localize(result.warnings().getFirst(), messages, persian);
        assertThat(localized).contains("config.py", "خط 1", "توکن GitHub").doesNotContain(credential);
    }

    @RestController
    static class DiagnosticProbe {
        @GetMapping("/diagnostic")
        public void fail() {
            throw new DomainBadRequestException("error.skill.publish.package.invalid",
                    List.of("Disallowed file extension: a, b.exe"));
        }
    }

    @Test
    void actualExceptionResponseNegotiatesPersianAndPreservesTheHttpContract() throws Exception {
        var accessor = mock(RequestIdAccessor.class);
        var factory = new ApiResponseFactory(messages, Clock.systemUTC(), accessor);
        var handler = new GlobalExceptionHandler(factory, mock(SensitiveLogSanitizer.class),
                mock(SkillHubMetrics.class), accessor);
        var mvc = MockMvcBuilders.standaloneSetup(new DiagnosticProbe()).setControllerAdvice(handler).build();
        mvc.perform(get("/diagnostic").header("Accept-Language", "fa-IR"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.msg").value("اعتبارسنجی بسته ناموفق بود: پسوند فایل مجاز نیست: a, b.exe"));
        mvc.perform(get("/diagnostic").header("Accept-Language", "en"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.msg").value(
                        messages.getMessage("error.skill.publish.package.invalid",
                                new Object[]{"Disallowed file extension: a, b.exe"}, Locale.ENGLISH)));
    }
}

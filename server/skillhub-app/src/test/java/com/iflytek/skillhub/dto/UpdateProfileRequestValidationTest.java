package com.iflytek.skillhub.dto;

import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class UpdateProfileRequestValidationTest {
    private static final ValidatorFactory FACTORY = Validation.buildDefaultValidatorFactory();

    @AfterAll
    static void closeValidator() {
        FACTORY.close();
    }

    @ParameterizedTest
    @ValueSource(strings = {"علی‌اکبر حسینی", "مریم ۱۴۰۵", "حُسین", "خانهٔ مهارت", "تیم ١٢", "Test User_1-2", "测试用户"})
    void acceptsHumanNamesWithoutChangingTheirCharacters(String name) {
        var request = new UpdateProfileRequest(name);
        assertThat(FACTORY.getValidator().validate(request)).isEmpty();
        assertThat(request.displayName()).isEqualTo(name);
    }

    @ParameterizedTest
    @ValueSource(strings = {"نام\nکاربر", "نام\u202Eکاربر", "نام\u2066کاربر", "نام\u200Dکاربر", "<script>", "user@host", "نام😀"})
    void rejectsControlsMarkupAndUnsupportedCharacters(String name) {
        assertThat(FACTORY.getValidator().validate(new UpdateProfileRequest(name)))
                .anySatisfy(violation -> assertThat(violation.getMessage()).isEqualTo("error.profile.displayName.pattern"));
    }

    @Test
    void preservesLengthAndOptionalFieldRules() {
        assertThat(FACTORY.getValidator().validate(new UpdateProfileRequest(null))).isEmpty();
        assertThat(FACTORY.getValidator().validate(new UpdateProfileRequest("ع"))).isNotEmpty();
        assertThat(FACTORY.getValidator().validate(new UpdateProfileRequest("م".repeat(33)))).isNotEmpty();
        assertThat(FACTORY.getValidator().validate(new UpdateProfileRequest("م".repeat(32)))).isEmpty();
    }
}

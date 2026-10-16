package com.iflytek.skillhub.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.iflytek.skillhub.domain.authoring.DraftFile;
import com.iflytek.skillhub.domain.authoring.service.SkillDraftService;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.junit.jupiter.api.Test;

class DraftFileContentResponseTest {
    @Test
    void keepsValidUtf8TextEditable() {
        byte[] bytes = "技能 draft".getBytes(StandardCharsets.UTF_8);
        var response = response(bytes);
        assertThat(response.encoding()).isEqualTo("text");
        assertThat(response.content().getBytes(StandardCharsets.UTF_8)).isEqualTo(bytes);
    }

    @Test
    void binaryContentCanBeReadAndSavedWithoutChangingItsBytes() {
        byte[] bytes = {(byte) 0x89, 0x50, 0x4e, 0x47, 0, (byte) 0xff};
        var response = response(bytes);
        var request = new SaveDraftFileRequest("image.png", response.content(), response.encoding(),
                "image/png", 1);
        assertThat(request.isBase64()).isTrue();
        assertThat(Base64.getDecoder().decode(request.content())).isEqualTo(bytes);
    }

    private DraftFileContentResponse response(byte[] bytes) {
        var file = new DraftFile(1L, "file", "digest", (long) bytes.length,
                "application/octet-stream", "drafts/1/digest");
        return DraftFileContentResponse.from(new SkillDraftService.FileContent(file, bytes));
    }
}

package com.iflytek.skillhub.dto;

import com.iflytek.skillhub.domain.authoring.service.SkillDraftService;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/** UTF-8 text stays editable; other file bytes use reversible base64 transport. */
public record DraftFileContentResponse(
        String path,
        String sha256,
        Long size,
        String contentType,
        String content,
        String encoding
) {
    public static DraftFileContentResponse from(SkillDraftService.FileContent fileContent) {
        String content;
        String encoding;
        try {
            content = StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(fileContent.content())).toString();
            encoding = "text";
        } catch (CharacterCodingException exception) {
            content = Base64.getEncoder().encodeToString(fileContent.content());
            encoding = "base64";
        }
        var file = fileContent.file();
        return new DraftFileContentResponse(file.getFilePath(), file.getSha256(), file.getSize(),
                file.getContentType(), content, encoding);
    }
}

package com.iflytek.skillhub.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for updating user profile fields.
 *
 * <p>All fields are optional — the caller supplies only the fields they want to change.
 * At least one non-null field must be present (validated in the controller).
 *
 * <p>Validation rules for displayName:
 * <ul>
 *   <li>Length: 2–32 characters (after trim)</li>
 *   <li>Allowed characters: Chinese, English, Persian letters/marks/digits, ZWNJ, spaces, underscore, hyphen</li>
 * </ul>
 *
 * @param displayName new display name (nullable — omit to leave unchanged)
 */
public record UpdateProfileRequest(
        @Size(min = 2, max = 32, message = "error.profile.displayName.length")
        @Pattern(regexp = "^[\\u4e00-\\u9fa5a-zA-Z0-9_\\u0621-\\u063A\\u0641-\\u065F\\u0660-\\u0669\\u067E\\u0686\\u0698\\u06A9\\u06AF\\u06C0\\u06CC\\u06F0-\\u06F9\\u200C -]+$",
                 message = "error.profile.displayName.pattern")
        String displayName
) {
    /**
     * Returns true if at least one field is provided.
     * Future fields (avatarUrl, etc.) should be added to this check.
     */
    public boolean hasChanges() {
        return displayName != null;
    }
}

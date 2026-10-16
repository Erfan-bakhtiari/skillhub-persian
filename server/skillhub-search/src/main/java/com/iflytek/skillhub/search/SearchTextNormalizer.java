package com.iflytek.skillhub.search;

import java.util.regex.Pattern;

/**
 * Search-only Persian orthographic folding. Keep in sync with the PostgreSQL
 * skillhub_search_normalize function; canonical content and identifiers must not use this helper.
 */
public final class SearchTextNormalizer {
    private static final Pattern ARABIC_MARKS = Pattern.compile("[\u0610-\u061A\u064B-\u065F\u0670\u0640]");
    private static final Pattern WORD_SPACES = Pattern.compile("[\\x{0009}-\\x{000D} \\x{200C}]+");

    private SearchTextNormalizer() {}

    public static String normalize(String value) {
        if (value == null) {
            return "";
        }
        String folded = ARABIC_MARKS.matcher(value).replaceAll("")
                .replace('\u064A', '\u06CC')
                .replace('\u0643', '\u06A9');
        return WORD_SPACES.matcher(folded).replaceAll(" ").trim();
    }
}

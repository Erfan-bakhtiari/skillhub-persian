package com.iflytek.skillhub.search;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SearchTextTokenizerTest {

    private final SearchTextTokenizer tokenizer = new SearchTextTokenizer();

    @Test
    void enrichForIndexShouldKeepRawPhraseAndAddSegmentedTokens() {
        String enriched = tokenizer.enrichForIndex("中文技能搜索");

        assertThat(enriched).contains("中文技能搜索");
        assertThat(tokenizer.tokenizeForIndex("中文技能搜索")).contains("中文", "技能", "搜索");
    }

    @Test
    void tokenizeForQueryShouldNormalizeAsciiTerms() {
        assertThat(tokenizer.tokenizeForQuery("OpenAI Agent"))
                .containsExactly("openai", "agent");
    }

    @Test
    void persianWordsShouldStayWholeAndUseTheSameFoldingInBothDirections() {
        for (String spelling : java.util.List.of("پردازش كِيـفيت", "پردازش کیفیت")) {
            assertThat(tokenizer.tokenizeForIndex(spelling)).containsExactly("پردازش", "کیفیت");
            assertThat(tokenizer.tokenizeForQuery(spelling)).containsExactly("پردازش", "کیفیت");
        }
        assertThat(tokenizer.tokenizeForQuery("کتاب")).containsExactly("کتاب");
        assertThat(tokenizer.tokenizeForQuery("کاتب")).doesNotContain("کتاب");
    }

    @Test
    void halfSpaceShouldBehaveAsAWordBoundaryWithoutJoiningOrdinarySpaces() {
        assertThat(tokenizer.tokenizeForQuery("  برنامه\u200Cنویسی\tپایتون "))
                .containsExactlyElementsOf(tokenizer.tokenizeForIndex("برنامه نویسی پایتون"));
        assertThat(tokenizer.tokenizeForQuery("برنامهنویسی")).containsExactly("برنامهنویسی");
    }

    @Test
    void mixedLanguageTextShouldRetainChineseSegmentationAndAsciiTerms() {
        assertThat(tokenizer.tokenizeForQuery("中文技能 OpenAI کیفیت"))
                .contains("中文", "技能", "openai", "کیفیت");
        assertThat(tokenizer.enrichForIndex("كِيـفيت\u200Cداده")).contains("کیفیت داده");
        assertThat(tokenizer.tokenizeForQuery(null)).isEmpty();
        assertThat(tokenizer.tokenizeForQuery("\u200Cَـ")).isEmpty();
    }
}

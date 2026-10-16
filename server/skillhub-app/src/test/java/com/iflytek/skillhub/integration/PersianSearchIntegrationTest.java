package com.iflytek.skillhub.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.iflytek.skillhub.domain.namespace.Namespace;
import com.iflytek.skillhub.domain.skill.Skill;
import com.iflytek.skillhub.domain.skill.SkillVersion;
import com.iflytek.skillhub.domain.skill.SkillVersionStatus;
import com.iflytek.skillhub.domain.skill.SkillVisibility;
import com.iflytek.skillhub.domain.suite.SkillSuite;
import com.iflytek.skillhub.domain.suite.SkillSuiteVersion;
import com.iflytek.skillhub.domain.suite.SkillSuiteVersionStatus;
import com.iflytek.skillhub.domain.user.UserAccount;
import com.iflytek.skillhub.infra.jpa.SkillSearchDocumentJpaRepository;
import com.iflytek.skillhub.search.HashingSearchEmbeddingService;
import com.iflytek.skillhub.search.ResourceDiscoveryQueryService.ResourceQuery;
import com.iflytek.skillhub.search.SearchQuery;
import com.iflytek.skillhub.search.SearchResult;
import com.iflytek.skillhub.search.SearchTextNormalizer;
import com.iflytek.skillhub.search.SearchTextTokenizer;
import com.iflytek.skillhub.search.SearchVisibilityScope;
import com.iflytek.skillhub.search.SkillSearchDocument;
import com.iflytek.skillhub.search.postgres.PostgresFullTextIndexService;
import com.iflytek.skillhub.search.postgres.PostgresFullTextQueryService;
import com.iflytek.skillhub.search.postgres.PostgresResourceDiscoveryQueryService;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** Exercises actual PostgreSQL parsing, generated vectors, ranking, discovery and Flyway upgrade. */
@DataJpaTest(showSql = false)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@Testcontainers
@TestPropertySource(properties = {
        "spring.flyway.enabled=true",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.jpa.show-sql=false",
        "logging.level.org.hibernate.SQL=OFF"
})
class PersianSearchIntegrationTest {
    @Container
    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void postgres(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
    }

    @Autowired private TestEntityManager entityManager;
    @Autowired private SkillSearchDocumentJpaRepository documents;
    @Autowired private JdbcTemplate jdbc;

    private final SearchTextTokenizer tokenizer = new SearchTextTokenizer();
    private Namespace namespace;
    private PostgresFullTextIndexService index;
    private PostgresFullTextQueryService search;
    private PostgresResourceDiscoveryQueryService discovery;

    @BeforeEach
    void seed() {
        entityManager.persist(new UserAccount("persian-owner", "مالک", null, null));
        namespace = entityManager.persistFlushFind(new Namespace("persian-test", "فارسی", "persian-owner"));
        // Instantiate the adapters inside this rollback-only fixture transaction.
        // Transaction propagation is tested separately by LabelSearchSyncIntegrationTest.
        var embeddings = new HashingSearchEmbeddingService();
        index = new PostgresFullTextIndexService(documents, embeddings);
        search = new PostgresFullTextQueryService(entityManager.getEntityManager(), documents, embeddings,
                tokenizer, false, 0.35D, 8, 120);
        discovery = new PostgresResourceDiscoveryQueryService(entityManager.getEntityManager());
    }

    @Test
    void javaAndPostgresNormalizationAgreeWithoutFoldingOtherLanguagesOrIdentifiers() {
        for (String value : Arrays.asList(null, "", " \t\n ", "كِيـفيت\u200Cداده", "برنامه نویسی",
                "برنامهنویسی", "یك", "OpenAI Agent", "中文技能搜索", "Русский поиск",
                "@team/my-skill v1.2.3", "۱۲۳ ١٢٣ 123", "ا\u0610\u061A\u064B\u065F\u0670ب",
                "X\u000B\u000CY\r\nZ")) {
            assertThat(jdbc.queryForObject("SELECT skillhub_search_normalize(?)", String.class, value))
                    .as("SQL and Java normalization of %s", value)
                    .isEqualTo(SearchTextNormalizer.normalize(value));
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"کیفیت داده", "كيفيت داده", "كِيـفيت\u200Cداده", "کیفیت\tداده"})
    void equivalentQueriesMatchTitleAndReturnOriginalText(String keyword) {
        Skill skill = indexedSkill("quality", "كِيـفيت\u200Cداده", "متن اصلی", "", SkillVisibility.PUBLIC);

        assertThat(find(keyword).skillIds()).containsExactly(skill.getId());
        assertThat(documents.findBySkillId(skill.getId()).orElseThrow().getTitle())
                .isEqualTo("كِيـفيت\u200Cداده");
        assertThat(entityManager.find(Skill.class, skill.getId()).getSummary()).isEqualTo("متن اصلی");
        var resources = discovery.search(resourceQuery(keyword, 0, 20));
        assertThat(resources.total()).isEqualTo(1);
        assertThat(resources.items()).singleElement().satisfies(hit -> {
            assertThat(hit.displayName()).isEqualTo("كِيـفيت\u200Cداده");
            assertThat(hit.slug()).isEqualTo("quality");
        });
    }

    @Test
    void summaryKeywordsAndMixedLanguageQueriesUseWholePersianWords() {
        Skill summary = indexedSkill("summary", "Summary", "پردازش كِيـفيت", "", SkillVisibility.PUBLIC);
        Skill keywords = indexedSkill("keywords", "Keywords", "متن", "برنامه\u200Cنویسی", SkillVisibility.PUBLIC);
        Skill mixed = indexedSkill("mixed", "Mixed", "中文技能 OpenAI کیفیت", "", SkillVisibility.PUBLIC);
        Skill book = indexedSkill("book", "کتاب", "کتاب", "", SkillVisibility.PUBLIC);
        indexedSkill("writer", "کاتب", "کاتب", "", SkillVisibility.PUBLIC);

        assertThat(find("پردازش کیفیت").skillIds()).containsExactly(summary.getId());
        assertThat(find("برنامه نویسی").skillIds()).containsExactly(keywords.getId());
        assertThat(find("中文技能 OpenAI كيفيت").skillIds()).containsExactly(mixed.getId());
        assertThat(find("کتاب").skillIds()).containsExactly(book.getId());
        assertThat(find("نویسیبرنامه").skillIds()).isEmpty();
        assertThat(find("برنامهنویسی").skillIds()).isEmpty();
    }

    @Test
    void normalizedExactTitleRanksFirstAndPaginationCountAgrees() {
        Skill exact = indexedSkill("exact", "كِيـفيت", "", "", SkillVisibility.PUBLIC);
        Skill prefix = indexedSkill("prefix", "کیفیت ابزار", "", "", SkillVisibility.PUBLIC);
        indexedSkill("suffix", "ابزار کیفیت", "", "", SkillVisibility.PUBLIC);

        assertThat(find("کیفیت").skillIds()).startsWith(exact.getId(), prefix.getId());
        SearchResult first = search.search(query("كيفيت", new SearchVisibilityScope(null, Set.of(), Set.of()), 0, 1));
        SearchResult second = search.search(query("كيفيت", new SearchVisibilityScope(null, Set.of(), Set.of()), 1, 1));
        assertThat(first.total()).isEqualTo(3);
        assertThat(second.total()).isEqualTo(3);
        assertThat(first.skillIds()).containsExactly(exact.getId());
        assertThat(second.skillIds()).containsExactly(prefix.getId());
    }

    @Test
    void foldingDoesNotBypassVisibilityOrHiddenFilters() {
        Skill visible = indexedSkill("visible", "کیفیت", "", "", SkillVisibility.PUBLIC);
        Skill member = indexedSkill("member", "كِيـفيت", "", "", SkillVisibility.NAMESPACE_ONLY);
        indexedSkill("private", "کیفیت", "", "", SkillVisibility.PRIVATE);
        Skill hidden = indexedSkill("hidden", "کیفیت", "", "", SkillVisibility.PUBLIC);
        hidden.setHidden(true);
        entityManager.flush();

        assertThat(find("كيفيت").skillIds()).containsExactly(visible.getId());
        SearchResult memberResult = search.search(query("كيفيت",
                new SearchVisibilityScope("persian-owner", Set.of(namespace.getId()), Set.of()), 0, 20));
        assertThat(memberResult.skillIds()).containsExactlyInAnyOrder(visible.getId(), member.getId());
        assertThat(memberResult.total()).isEqualTo(2);
        assertThat(discovery.search(resourceQuery("كيفيت", 0, 20)).total()).isEqualTo(1);
    }

    @Test
    void suiteDiscoveryNormalizesPublishedSnapshotAndKeepsTypeAndNamespaceFilters() {
        indexedSkill("single", "پردازش کیفیت", "", "", SkillVisibility.PUBLIC);
        SkillSuite suite = entityManager.persistFlushFind(
                new SkillSuite(namespace.getId(), "collection", "نام فعلی", "persian-owner"));
        SkillSuiteVersion version = new SkillSuiteVersion(suite.getId(), "1.2.3", "پردازش كِيـفيت",
                "برنامه\u200Cنویسی", SkillVisibility.PUBLIC, "persian-owner");
        version.setStatus(SkillSuiteVersionStatus.PUBLISHED);
        version = entityManager.persistFlushFind(version);
        suite.setLatestVersionId(version.getId());
        entityManager.flush();

        var all = discovery.search(resourceQuery("پردازش کیفیت", 0, 20));
        assertThat(all.total()).isEqualTo(2);
        var suites = discovery.search(new ResourceQuery("برنامه نویسی", namespace.getSlug(), "SUITE",
                "relevance", 0, 20, Set.of(), List.of()));
        assertThat(suites.total()).isEqualTo(1);
        assertThat(suites.items()).singleElement().satisfies(hit -> {
            assertThat(hit.displayName()).isEqualTo("پردازش كِيـفيت");
            assertThat(hit.summary()).isEqualTo("برنامه\u200Cنویسی");
            assertThat(hit.slug()).isEqualTo("collection");
            assertThat(hit.version()).isEqualTo("1.2.3");
        });
        assertThat(discovery.search(new ResourceQuery("کیفیت", "other-team", "", "newest",
                0, 20, Set.of(), List.of())).total()).isZero();
    }

    @Test
    void upgradingExistingIndexRecomputesVectorWithoutChangingStoredContent() {
        String schema = "persian_upgrade_" + UUID.randomUUID().toString().replace("-", "");
        // Commit the old documents before Flyway takes its migration table lock.
        JdbcTemplate upgradeJdbc = new JdbcTemplate(new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
        Flyway.configure().dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .schemas(schema).defaultSchema(schema).target("69").load().migrate();
        upgradeJdbc.update("INSERT INTO " + schema + ".user_account(id, display_name) VALUES ('owner', 'Owner')");
        Long nsId = upgradeJdbc.queryForObject("INSERT INTO " + schema
                + ".namespace(slug, display_name, type, created_by) VALUES ('team', 'Team', 'TEAM', 'owner') RETURNING id", Long.class);
        Long skillId = upgradeJdbc.queryForObject("INSERT INTO " + schema
                + ".skill(namespace_id, slug, owner_id) VALUES (?, 'quality', 'owner') RETURNING id", Long.class, nsId);
        upgradeJdbc.update("INSERT INTO " + schema + ".skill_search_document"
                + "(skill_id, namespace_id, namespace_slug, owner_id, title, summary, keywords, search_text, visibility, status)"
                + " VALUES (?, ?, 'team', 'owner', ?, '', '', '', 'PUBLIC', 'ACTIVE')",
                skillId, nsId, "كِيـفيت\u200Cداده");
        String matchSql = "SELECT search_vector @@ to_tsquery('simple', 'کیفیت & داده') FROM "
                + schema + ".skill_search_document WHERE skill_id = ?";
        assertThat(upgradeJdbc.queryForObject(matchSql, Boolean.class, skillId)).isFalse();

        Flyway.configure().dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .schemas(schema).defaultSchema(schema).load().migrate();

        assertThat(upgradeJdbc.queryForObject(matchSql, Boolean.class, skillId)).isTrue();
        assertThat(upgradeJdbc.queryForObject("SELECT title FROM " + schema
                + ".skill_search_document WHERE skill_id = ?", String.class, skillId)).isEqualTo("كِيـفيت\u200Cداده");
    }

    private Skill indexedSkill(String slug, String title, String summary, String keywords, SkillVisibility visibility) {
        Skill skill = new Skill(namespace.getId(), slug, "persian-owner", visibility);
        skill.setDisplayName(title);
        skill.setSummary(summary);
        skill = entityManager.persistFlushFind(skill);
        SkillVersion version = new SkillVersion(skill.getId(), "1.0.0", "persian-owner");
        version.setStatus(SkillVersionStatus.PUBLISHED);
        version.setDownloadReady(true);
        version = entityManager.persistFlushFind(version);
        skill.setLatestVersionId(version.getId());
        entityManager.flush();
        index.index(new SkillSearchDocument(skill.getId(), namespace.getId(), namespace.getSlug(), "persian-owner",
                title, summary, tokenizer.enrichForIndex(keywords),
                tokenizer.enrichForIndex(slug + " " + summary), null, visibility.name(), "ACTIVE"));
        entityManager.flush();
        return skill;
    }

    private SearchResult find(String keyword) {
        return search.search(query(keyword, new SearchVisibilityScope(null, Set.of(), Set.of()), 0, 20));
    }

    private SearchQuery query(String keyword, SearchVisibilityScope scope, int page, int size) {
        return new SearchQuery(keyword, namespace.getId(), scope, "relevance", page, size, List.of(), true);
    }

    private ResourceQuery resourceQuery(String keyword, int page, int size) {
        return new ResourceQuery(keyword, namespace.getSlug(), "", "relevance", page, size, Set.of(), List.of());
    }
}

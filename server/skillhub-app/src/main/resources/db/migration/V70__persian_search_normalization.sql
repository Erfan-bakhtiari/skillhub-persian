-- Search-only folding. Canonical titles, summaries, package content and IDs are untouched.
-- Keep this mapping in sync with SearchTextNormalizer in skillhub-search.
CREATE FUNCTION skillhub_search_normalize(value text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
    SELECT btrim(regexp_replace(
        translate(regexp_replace(coalesce(value, ''),
            U&'[\0610-\061A\064B-\065F\0670\0640]', '', 'g'),
            U&'\064A\0643', U&'\06CC\06A9'),
        U&'[\0009-\000D \200C]+', ' ', 'g'))
$$;

-- Recompute existing full-text documents as well as future writes. This rebuilds the
-- stored vector and GIN index during migration; plan for a table lock on large registries.
DROP INDEX IF EXISTS idx_search_vector;
ALTER TABLE skill_search_document DROP COLUMN search_vector;
ALTER TABLE skill_search_document ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', skillhub_search_normalize(title)), 'A') ||
    setweight(to_tsvector('simple', skillhub_search_normalize(summary)), 'B') ||
    setweight(to_tsvector('simple', skillhub_search_normalize(keywords)), 'B') ||
    setweight(to_tsvector('simple', skillhub_search_normalize(search_text)), 'C')
) STORED;
CREATE INDEX idx_search_vector ON skill_search_document USING GIN (search_vector);

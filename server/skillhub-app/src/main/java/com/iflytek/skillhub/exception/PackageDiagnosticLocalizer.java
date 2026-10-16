package com.iflytek.skillhub.exception;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.context.MessageSource;

/**
 * Presentation-only translations of the validator's legacy diagnostics. Match entire
 * messages; captured file paths, field names and numbers are opaque interpolation values.
 * Unknown extension diagnostics remain intact instead of guessing their meaning.
 */
public final class PackageDiagnosticLocalizer {
    private record Rule(Pattern pattern, String key) {}
    private static Rule rule(String key, String pattern) {
        return new Rule(Pattern.compile(pattern, Pattern.DOTALL), "diagnostic.package." + key);
    }
    private static final List<Rule> RULES = List.of(
            rule("rootMissing", "Missing required file: SKILL\\.md at root"),
            rule("duplicate", "Duplicate package entry path: (.+)"),
            rule("extension", "Disallowed file extension: (.+)"),
            rule("content", "File content does not match extension: (.+)"),
            rule("pathMissing", "Package entry path is missing"),
            rule("pathEmpty", "Package entry path is empty"),
            rule("pathRelative", "Package entry path must be relative: (.+)"),
            rule("pathPrefix", "Package entry path contains an invalid drive or scheme prefix: (.+)"),
            rule("pathInvalid", "Package entry path is invalid: (.+)"),
            rule("pathEscape", "Package entry path escapes package root: (.+)"),
            rule("pathNormalized", "Package entry path must be normalized: (.+)"),
            rule("fileCount", "Too many files: (\\d+) \\(max: (\\d+)\\)"),
            rule("fileSize", "File too large: (.+) \\((\\d+) bytes, max: (\\d+)\\)"),
            rule("packageSize", "Package too large: (\\d+) bytes \\(max: (\\d+)\\)"),
            rule("fieldMissing", "missing required field \"(.+)\""),
            rule("opening", "missing opening --- marker"),
            rule("closing", "missing closing --- marker"),
            rule("emptyMetadata", "frontmatter is empty"),
            rule("metadataObject", "frontmatter must be a YAML object"),
            rule("yamlLocation", "invalid YAML near line (\\d+), column (\\d+)\\. If a value contains a colon, wrap it in quotes\\."),
            rule("yaml", "invalid YAML syntax"),
            rule("cloudSecret", "(.+) line (\\d+) contains a value that looks like a cloud access key\\. Replace real credentials with placeholders before publishing\\."),
            rule("githubSecret", "(.+) line (\\d+) contains a value that looks like a GitHub token\\. Replace real credentials with placeholders before publishing\\."),
            rule("apiSecret", "(.+) line (\\d+) contains a value that looks like a API key\\. Replace real credentials with placeholders before publishing\\."),
            rule("genericSecret", "(.+) line (\\d+) contains a value that looks like a secret or token\\. Replace real credentials with placeholders before publishing\\."),
            rule("namespaceMissing", "Namespace not found: (.+)"),
            rule("namespaceFrozen", "Namespace is frozen: (.+)"),
            rule("namespaceArchived", "Namespace is archived: (.+)"),
            rule("notMember", "Publisher is not a member of namespace: (.+)"),
            rule("archived", "Cannot publish to archived skill: (.+)"),
            rule("versionPublished", "Version already published: (.+)"),
            rule("nameConflict", "Name conflict: slug \"(.+)\" is already published by another user"),
            rule("array", "(x-astron-compliance(?:\\[\\d+\\])?(?:\\.evidence)?) must be an array"),
            rule("items", "(x-astron-compliance(?:\\[\\d+\\]\\.evidence)?) must contain at most (\\d+) items"),
            rule("object", "(x-astron-compliance\\[\\d+\\](?:\\.evidence\\[\\d+\\])?) must be an object"),
            rule("format", "(x-astron-compliance\\[\\d+\\]\\.(?:standard|controlId)) has an invalid format"),
            rule("mappingDuplicate", "x-astron-compliance contains duplicate mapping (.+)"),
            rule("evidenceType", "(x-astron-compliance\\[\\d+\\]\\.evidence\\[\\d+\\]\\.type) must be one of packaged-file, external-url"),
            rule("evidenceMissing", "(x-astron-compliance\\[\\d+\\]\\.evidence\\[\\d+\\]\\.path) does not exist in package: (.+)"),
            rule("url", "(x-astron-compliance\\[\\d+\\]\\.evidence\\[\\d+\\]\\.url) must be an http or https URL"),
            rule("required", "(x-astron-compliance\\[\\d+\\](?:\\.evidence\\[\\d+\\])?\\.[\\w-]+) is required"),
            rule("length", "(x-astron-compliance\\[\\d+\\](?:\\.evidence\\[\\d+\\])?\\.[\\w-]+) must be at most (\\d+) characters"),
            rule("nonEmpty", "(x-astron-compliance\\[\\d+\\]\\.[\\w-]+) must be a non-empty string"),
            rule("notAllowed", "(x-astron-compliance\\[\\d+\\](?:\\.evidence\\[\\d+\\])?\\.[\\w-]+) is not allowed")
    );

    private PackageDiagnosticLocalizer() {}

    public static String localize(String value, MessageSource messages, Locale locale) {
        if (value == null || !"fa".equals(locale.getLanguage())) {
            return value;
        }
        for (String prefix : List.of("Invalid SKILL.md frontmatter: ", "Invalid SKILL.md: ",
                "Invalid skill name for slug generation: ")) {
            if (value.startsWith(prefix)) {
                String key = prefix.startsWith("Invalid skill name") ? "invalidName" : "frontmatter";
                return messages.getMessage("diagnostic.package." + key,
                        new Object[]{localize(value.substring(prefix.length()), messages, locale)}, value, locale);
            }
        }
        var pathPrefix = Pattern.compile("^(x-astron-compliance\\[\\d+\\]\\.evidence\\[\\d+\\]\\.path) (Package entry path .+)$",
                Pattern.DOTALL).matcher(value);
        if (pathPrefix.matches()) {
            return pathPrefix.group(1) + ": " + localize(pathPrefix.group(2), messages, locale);
        }
        for (Rule rule : RULES) {
            var matcher = rule.pattern().matcher(value);
            if (matcher.matches()) {
                Object[] args = new Object[matcher.groupCount()];
                for (int i = 0; i < args.length; i++) args[i] = matcher.group(i + 1);
                return messages.getMessage(rule.key(), args, value, locale);
            }
        }
        if (value.startsWith("error.")) {
            String resolved = messages.getMessage(value, null, value, locale);
            // Legacy dry-run strings can discard exception arguments. Do not expose
            // incomplete templates or invent the missing identifier/limit values.
            return Pattern.compile("\\{\\d+(?:[,}])").matcher(resolved).find() ? value : resolved;
        }
        return value;
    }
}

# Public Persian adaptation release

Date: 2026-10-16. Repository: [Erfan-bakhtiari/skillhub-persian](https://github.com/Erfan-bakhtiari/skillhub-persian).

## Provenance

This is an independent adaptation of [iFLYTEK SkillHub](https://github.com/iflytek/skillhub),
based on upstream commit `7893331c`. The local adaptation already includes Persian
localization, source-container tooling and a discovery-first entry page. The public
import also includes the current language preference and RTL improvements.

The previous English README is preserved byte-for-byte in `README.upstream.md` and
retained below the new introduction in `README.md`. `README_zh.md`, `LICENSE` and
the existing upstream/third-party notices are retained.

## Publication hygiene

- Exported the current source into a new Git repository with a fresh root commit.
  Previous local history, branches, tags and reflogs are not part of this import.
- Excluded the previously tracked `.env.release.draft` and `.mcp.json`.
- Real `.env.source`, development tools, credentials, storage, backups, logs,
  screenshots from local checks and other ignored runtime files are excluded.
- Added `.env.source.example` with explicit replacement placeholders and local
  filesystem storage in a Docker volume. The actual local environment is retained
  privately and is not overwritten by the template.
- Preserved executable file modes from the source Git index, including Maven and
  shell entrypoints needed by Linux container builds.
- Used GitHub's account-specific noreply address for the public import commit.
- Scanned the source history and the exported source with Gitleaks 8.30.1. Reviewed
  fixture/prose findings have narrowly scoped exceptions in `.gitleaks.toml`;
  each requires both a specific file and the exact synthetic value or prose.
  No entire test directory is exempted. A new synthetic token outside those
  exceptions was detected by a separate scanner check.
- Checked that actual local environment passwords and secrets do not occur in the
  exported source. This is a source and Git publication check, not a running-system
  penetration test.

The upstream workflows are retained, with frontend PR workflows updated to use
the declared pnpm version and Node 24. GitHub Actions are disabled for the initial
import because upstream release, documentation deployment, scheduled reward and
triage automations require separate configuration. GitHub Pages is not published.

## Verification of this source

- TypeScript check and ESLint: passed.
- Production frontend build: passed.
- Frontend unit tests: 221 files, 936 tests passed. Three stale expectations for
  the removed Chinese UI locale were updated for the current Persian fallback.
- Persian browser regression: all 35 tests passed, including saved language
  preferences, authentication, publishing, discovery, management, profile,
  security reports and RTL layout. These use deterministic API fixtures against
  the source Vite server; they do not establish live backend authorization.
- Source Compose configuration with `.env.source.example`: passed validation.
- The local development launcher sets `SKILLHUB_BUILTIN_SKILLS_ENABLED=false`.
  That contaminates the default-enabled configuration assertion in
  `BuiltinSkillPropertiesBindingTest`. The complete reactor reported 2,231 tests,
  one failure in that assertion, zero errors and one skipped test. Both tests in
  the affected class passed when rerun in the Maven reactor with the variable
  unset (`BUILD SUCCESS`). The broad run is not represented as a clean full-suite
  pass; a second complete reactor run was not performed.

The formal `make staging` deployment and full live SMTP/OAuth/LLM integrations
were not run for this publication. Older dated deployment observations remain
in `LOCAL-DOCKER.md` and `persian-localization.md` and are separate from these
checks of the current source.

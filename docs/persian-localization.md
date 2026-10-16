# Persian localization

Status: seven implementation slices, 2026-10-15; language preferences updated
2026-10-16. The interface supports Persian and English only. Persian is the default
regardless of browser language; explicit supported choices persist in localStorage.
Previously saved Chinese or Russian preferences fall back to Persian.
All current English interface resource keys have
Persian counterparts. The current base server message bundle also has complete
Persian key coverage. Persian search normalization and a 14-page Persian user guide
are implemented. Known package diagnostics and scanner-rule guidance now have
Persian presentation. Arbitrary external output remains intact; deployment
verification is recorded below. Local source-container deployment and smoke checks
have passed. Public guide publication was canceled by the user.

## Included in this slice

- Persian language selection by default, with an explicit Persian or English
  localStorage preference taking priority.
- Document language and direction synchronized before the first React content and
  on language changes, including direct links. Radix and Sonner share the resolved
  direction; the existing portal host and React 19 workarounds are preserved.
- Existing, locally hosted IRANSans FaNum assets for Persian UI. CSS tokens
  `--font-body`, `--font-heading`, `--font-mono` and `--heading-tracking` are the
  common typography source for base CSS and Tailwind utilities.
- Navigation, search, skill details, authentication, settings, namespace/member/token
  management, reviews, governance, administration, suites and bundle publishing:
  all 2,287 English resource keys have Persian counterparts. `fa.json` has 2,291
  string leaves, including four earlier aliases. Key coverage does not establish
  runtime coverage for every permission level, conditional panel or server response.
- Search labels are cached per language so switching languages requests localized
  results again. Label translations themselves remain managed in the database.
- Code and install commands remain LTR, with JetBrains Mono for technical ASCII
  text. Package prose uses automatic direction; source files and clipboard values
  are preserved.
- Persian calendar and Persian numerals for Persian date display, with the existing
  browser timezone. Explicit formatter options may override this policy. Stored
  timestamps and Gregorian ASCII `datetime-local` values are unchanged.
- All 451 current base server message keys have Persian counterparts, including
  password-reset email templates and 91 previously unresolved keys in server code.
  Known package-validation details are localized; arbitrary external diagnostics
  remain unchanged.

## Verification

Use the pnpm version declared in `web/package.json` (10.33.0). The local globally
available pnpm 11 ignores this project's `pnpm.overrides` configuration and cannot
perform a frozen installation with the current lockfile.

```sh
cd web
pnpm install --frozen-lockfile
pnpm build
pnpm lint
pnpm exec vitest run --maxWorkers=3
pnpm exec playwright test e2e/persian-locale.spec.ts e2e/persian-auth-publish.spec.ts e2e/persian-management.spec.ts e2e/persian-profile.spec.ts e2e/persian-security.spec.ts
```

The Persian Playwright tests use deterministic API fixtures. They exercise language
switching, reload, a direct `fa-IR` browser visit, the search-to-detail flow, actual
clipboard contents, font loading, portal direction/Escape, and 360/1440px layouts.
They also capture light screenshots and a dark mobile screenshot for visual review.
Run against a development source server; use `PLAYWRIGHT_BASE_URL` for an existing
server at another port. They do not establish Persian search quality against PostgreSQL.

`PersianMessagesTest` verifies the production message factory, interpolation and
fallback, and `Accept-Language: fa/fa-IR` on the health controller through MockMvc.
Authentication failure and password-reset messages are also covered, including the
generic reset response that does not disclose account eligibility. It does not
cover security filters before MVC. Use `make test-backend-app` with
Java 21 and Docker available for the broader suite. Some backend tests read
`builtin-skills/` and migration files relative to the repository root; container
test environments must retain this directory structure and provide Docker access
for Testcontainers.

Verification through the second slice on 2026-10-15:

- Production build, `tsc -b`, lint and `git diff --check`: passed.
- Vitest: 222 files, 930 tests passed.
- First Persian Playwright suite: 3 tests passed; light desktop/mobile and dark mobile
  screenshots were reviewed. API responses in this suite are fixtures.
- Persian server tests: 3 passed, including regional header negotiation and auth/reset messages.
- Broader backend reactor tests ran with Docker access. The app module reported
  1095 tests, no assertion failures, 9 filesystem setup errors and 1 skipped test.
  All 9 setup errors were confined to `BuiltinSkillSourcePackageTest`,
  `FlywayMigrationGuardrailTest` and `BackendTimeGuardrailTest`; they passed on a
  targeted rerun with repository source mounts. Other reactor modules passed.
  A single clean full-suite rerun with those mounts and full staging/smoke remain
  release gates; the failed initial invocation is not recorded as a clean pass.

## Second slice: authentication and publishing

The second slice adds 321 UI strings and 37 server messages to the first slice.
It covers login, registration, password reset, the shared authentication layout,
the dashboard overview/sidebar/user menu, My Skills, package selection and the
publish warning dialog. Other dashboard settings and administration routes still
use fallback text where not translated.

The login agreement is a single `Trans` message with semantic links in all four
languages. Locale-specific whitespace branches are no longer needed. Required
login errors are stored as translation keys so they update when the language
changes. Duplicate registration responses are recognized across all resource
languages, including a Persian server response received after an interface switch.
Registration and reset forms use their existing custom validation instead of
browser-native popups, keeping field errors in the selected interface language.

Credential inputs, reset codes and selected package names use LTR isolation and
the technical font. No password/code normalization, user ID changes, authentication
policy changes or API contract changes were introduced. The existing ASCII reset
code contract is preserved, including leading zeros. OAuth provider names, namespace
slugs, scanner warnings and package contents retain their original values.

Five new browser tests cover failed login without redirection, returnTo preservation,
duplicate/successful registration, password reset and unchanged request bodies,
dashboard navigation, RTL Radix selects and the two-step publish warning flow at
360px and 1440px. These tests use API fixtures and do not create real accounts,
send reset email or publish actual packages. Login and publish screenshots were
visually reviewed. Reset email templates remain untranslated.

Final second-slice checks: all 930 Vitest tests and lint/typechecking passed; all
5 new browser tests passed after the form-validation changes. The 3 first-slice
browser tests also passed during regression. The 3 Persian server tests passed
with the updated bundle. Existing containers on ports 3000/8080 have not been
redeployed; the source preview is on port 3001. Full staging and a live auth/email
workflow against a newly built server remain release checks.

## Third slice: remaining interface resources and management

This slice adds 1,710 Persian interface strings, covering landing/home, settings,
namespace creation and membership, API tokens, review/governance, administration,
conditional skill detail controls, version comparison and the complete Suite resource
tree. A resource test checks every English key, interpolation names and executable
command templates. The existing Chinese and English notification text was moved
into resources, with Russian and Persian event translations added. Unknown events
retain the server title; malformed metadata does not produce a fabricated description.

Persian notification sentences isolate skill coordinates and versions. Relative time
no longer appends a second Persian "ago". The unread badge has a translated accessible
label and localized displayed counts. Namespace/member roles and standard platform
roles display translated names while request enum values stay unchanged.

Reviewed controls use logical alignment/spacing in namespace, token, administration,
review and Suite screens. User prose uses automatic direction; identifiers, token
reveals, datetime-local fields and the diff code canvas remain LTR. Terminal command
text and actual clipboard contents are preserved. Resource-search cache keys include
the language so returned Suite label names can be refetched on a locale switch.

Persian privacy and terms pages translate the existing English document structure,
including all eight/nine sections and the original March 14, 2026 update date. This
translation does not introduce a new local legal policy or change the original date.

Five new browser tests use explicit API fixtures for namespace creation, adding a
member as ADMIN, token creation with a Gregorian custom expiry and unchanged token
clipboard, security settings, notifications, admin role dialogs, Suite listings and
authoring controls, the legal pages and landing command copies. Mobile and desktop
dialogs and the mobile CLI preview were visually inspected. These checks do not
publish real resources, grant real access or establish complete live backend coverage.

Final third-slice checks: 222 Vitest files / 933 tests passed; TypeScript,
ESLint (zero warnings), the production Vite build and `git diff --check` passed.
The eight discovery/auth/publish regression browser tests passed. After correcting
an authoring-test selector to match the existing technical namespace option,
all five management tests passed again, including the added authoring/legal checks.
The initial combined browser run is not counted as a clean thirteen-test invocation.
The production build retains the existing runtime-config, mixed dashboard import
and large-chunk warnings. No new backend build or staging deployment was performed.

## Fourth slice: human names, server messages and reset email

Both profile validators now accept Persian letters, combining marks, Persian/Arabic
digits and ZWNJ alongside the existing supported characters. Names are not normalized
or transliterated. The 2–32-character limit, username/slug rules, moderation policy,
permissions and account IDs are unchanged. The profile response envelope now resolves
its existing status-specific message key instead of returning the undefined
`response.success.update` key; the machine-readable status/message fields remain.

The server bundle now covers all 405 current base keys. This includes the original
311, two mail templates, the missing mixed-profile response, and 91 existing literals
which previously had no base translation. New English defaults were added for those
91 so unsupported locales also receive readable messages. The duplicate-request
interceptor uses the normal response factory, preserving its response code, timestamp
and request ID while translating its message.

Password-reset emails use the synchronous request locale for both self-service and
admin-triggered requests. No recipient-language preference exists, so this does not
claim that admin-triggered email uses a stored recipient locale. English is the
unsupported-language fallback. Verification codes use `Locale.ROOT` formatting and
remain six ASCII digits even when the JVM default is Persian. The Persian plain-text
template puts the code on its own line. No actual email was sent during verification.

Publishing helpers recognize Persian and Russian warning/validation/version-conflict
messages alongside the previous English/Chinese forms and stable keys. Their tests
read actual server templates with Vite raw imports, retaining warning extraction and
confirmation behavior. The browser publish fixture now returns a Persian warning.

New backend checks cover the full message key/argument tree, formatting, email locale
handoff and ASCII codes, Persian DTO validation and HTTP profile updates, 401/403 before
MVC and localized duplicate-request responses. Browser checks exercise unchanged
Persian name payloads, rejection of bidi control characters, immediate updates and
the existing pending-review path at 360/1440px. Generated types are regenerated with
the normal OpenAPI TypeScript generator from the actual Spring test-context schema;
the wider accepted name pattern does not change the generated TypeScript string type.

Final fourth-slice verification on 2026-10-15:

- Full Java 21 reactor (`-pl skillhub-app -am test`): **BUILD SUCCESS**;
  2,164 tests reported, zero failures/errors and one skipped (2,163 executed).
  The app module reports 1,116 tests, zero failures/errors, one skipped. This is
  a single clean rerun with the correct source mounts and Docker host override,
  closing the earlier full-backend-test verification gap. It does not replace staging.
- Frontend: all **222 files / 937 Vitest tests**, TypeScript and ESLint passed;
  production build passed with the existing Vite warnings.
- All **15 Persian Playwright tests passed in one run**. The profile pair was also
  rerun successfully after matching the pending-profile fixture to the server GET
  contract and taking stable full-page screenshots, which were visually reviewed.
- The final Spring-context OpenAPI export was regenerated through
  `openapi-typescript`; `git diff --exit-code` confirms no generated-type drift.
- Bundle inventory: 405 unique keys in both base and Persian, no duplicate keys,
  matching message arguments. `git diff --check` passed.

On this Windows host, the containerized test run needs the Docker socket,
`TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal`, and the repository layouts at
`/server` and `/builtin-skills`. The first run failed to reach Ryuk through the
bridge address; it is not reported as a passing run. The corrected complete reactor
succeeded. SMTP delivery and a deployment of the newly built source have not been
performed; the existing application containers still run the previous images.

## Fifth slice: Persian search

Search folds Arabic yeh/kaf to Persian yeh/kaf, removes Arabic combining marks and
tatweel, and treats ZWNJ as a word boundary equivalent to an ordinary space. For
example, `كِيـفيت‌داده` and `کیفیت داده` use the same search terms. Joined spelling
such as `برنامهنویسی` remains a separate word from `برنامه نویسی`; this is neither
stemming nor typo correction. Digits and other scripts are not transliterated.

`SearchTextNormalizer` is shared by query/index tokenization and hashed embeddings.
Persian words stay whole instead of being split into individual characters by
Jieba. Chinese segmentation and ASCII prefix behavior remain in place. PostgreSQL's
`skillhub_search_normalize` function applies the same mapping to generated full-text
vectors and title fallback/ranking. Combined Skill/Suite discovery applies it to
display names and summaries, including the published Suite snapshot. Structured
namespace, type, visibility and label filters retain their existing rules.

Canonical titles, summaries, metadata, package files, hashes, coordinates and API
payloads are preserved. Only search derivatives change. The SQL/Java mapping has a
corpus parity test so future changes must update both implementations.

Deployment sequence:

1. Apply Flyway `V70__persian_search_normalization.sql` with the new backend.
   It recomputes the stored search vector and recreates the GIN index for existing
   documents, preserving the original columns. This takes a table lock and must
   be scheduled appropriately for the registry size. No production-scale timing
   benchmark has been performed.
2. Once the new backend is running, a `SUPER_ADMIN` should invoke the existing
   authenticated `POST /api/v1/admin/search/rebuild` operation once to refresh old
   semantic vectors and token enrichment from canonical records. Migration alone
   updates full-text matching but cannot recompute Java-generated embeddings.
3. Verify Persian queries, access filters and relevance after the rebuild. Keep
   this source, migration and query adapters together; the adapters require the
   new SQL function.

Verification: the focused Java 21 run passed **50 tests**, including ten new real
PostgreSQL 16 tests and ten existing Suite discovery tests. The new tests exercise
Java/SQL normalization parity, title/summary/keyword matching, mixed Chinese/ASCII/
Persian queries, whole-word distinctions, unchanged result text, exact-title
ranking, page counts, hidden/private/namespace filtering, Suite snapshots and an
actual Flyway 69-to-70 upgrade with an existing search document. The original
stored title survives that upgrade. No live registry index has been rebuilt.

Final fifth-slice regression: the full Java 21 reactor (`-pl skillhub-app -am test`)
completed with **BUILD SUCCESS**: **2,178 tests reported**, zero failures/errors and
one skipped (2,177 executed). Search reports 39 tests; app reports 1,126 with the
one skip. The first full run exposed a missing search-function binding in an existing
H2 numeric-query CLI authorization fixture. That fixture now binds the Java helper;
its five tests and all real PostgreSQL checks pass together in the final full run.
The first failed run is not counted as a clean pass. This slice changes no frontend
source or API contract; frontend tests were not rerun and generated API types have
no diff. `git diff --check` passes. Staging and deployment remain outstanding.

## Sixth slice: Persian documentation

`docs/skillhub/fa/` contains 14 Persian pages corresponding to every English guide
route: home, introduction, quickstart, FAQ, publishing, discovery, namespaces,
review, scanning, social features, CLI, Suite Bundle, Runtime integration and
Kubernetes. These are concise guides adapted to the current source, rather than
verbatim copies of outdated English statements. They distinguish `SKILL.md` from
`package.json`, the release Web port from the development port, display names
from identifiers, private visibility from namespace membership, and upload from
publication/download readiness. The existing English and Chinese Markdown pages
are unchanged. Their older factual issues are not corrected by this translation.

VitePress 1.6.4 (the existing lockfile version) supports locale-specific `dir` and
updates it during client navigation. The new `fa-IR` locale sets RTL and translates
navigation, outlines, page footers, supported theme labels, local-search controls
and code-copy tooltips. The custom theme reuses the tracked IRANSans regular/bold
assets from `web/public/fonts/iransans/`; Vite bundles them with base-aware URLs.
The docs workflow also watches these shared font sources.

`postcss-rtlcss` 6.0.0 generates both layout directions. Its prefixes use `:where`
to keep their specificity zero: ordinary theme breakpoint and `.open` rules must
still override transformed declarations. The initial default-prefix build pushed
the desktop sidebar outside the viewport; this was fixed and verified in the final
browser pass. Code blocks, inline technical strings and clipboard commands remain
LTR. Home imagery with untranslated text is not reused in the Persian pages.

The landing-page docs CTA, app footer and quickstart CLI docs link now target the
Persian guide when the interface language is Persian. Other languages retain their
existing destinations. Publishing this guide to the configured public docs host
is still required before those new public URLs become available there.

Verification on 2026-10-15:

- Production VitePress build passed, including its existing dead-link validation.
  All 14 English route counterparts exist in Persian. YAML Suite, Runtime JSON and
  `SKILL.md` examples match the corresponding original examples byte for byte.
- Chromium visited all 14 Persian routes at 360px and 1440px (**28 page visits**):
  correct `lang`/`dir`, IRANSans, LTR code and no document horizontal overflow;
  desktop sidebar within the viewport; mobile sidebar navigation works.
- Persian local search found `نیم‌فاصله` and Enter opened its result. Clipboard
  commands were checked exactly after normalizing Windows CRLF line endings.
  Light/dark screenshots and the mobile menu were visually reviewed.
- Switching `fa → en → fa → zh` preserved the corresponding page and changed
  document direction and font appropriately. No page errors or failed HTTP
  responses occurred in the final guide pass. SSR HTML also has correct language
  and direction for all three guide locales.
- Docs config/theme TypeScript check and app TypeScript check passed. ESLint passed
  for the three app files changed in this slice. The existing Persian landing
  Playwright test passed, preserving CLI clipboard behavior; live source fixtures
  verified the three docs-link destinations in Persian, English and Chinese.
  The app production build also passed with its existing Vite warnings.
- Backend/API source and generated types were not changed by this slice. The full
  2,178-test backend run and 937-test frontend suite are previous-slice evidence;
  they were not rerun for this documentation change. No cluster or deployment
  command printed in the guide was executed.

Local review: build with `cd docs/skillhub && npm ci && npm run build`, then
`npm run preview -- --host 127.0.0.1 --port 4175` and open
`http://127.0.0.1:4175/skillhub/fa/`. Restart the preview after rebuilding because
its in-memory file cache can retain references to old hashed assets.

## Seventh slice: package diagnostics and external scanner guidance

The user explicitly canceled public guide publication. No fork, push, Pages
publication or public hosting change was performed. The 14-page Persian guide
remains in the repository. The three app documentation links use their existing
public destinations, avoiding unpublished Persian URLs.

PackageDiagnosticLocalizer translates known legacy diagnostics at the presentation
boundary for Persian requests: package paths, limits, frontmatter/YAML, credential
warnings, compliance evidence and dry-run publication checks. Domain exceptions
carry diagnostic lists until ApiResponseFactory formats them; comma-containing
filenames are never split. Dry-run response fields and HTTP/API contracts remain
unchanged. Unknown extension diagnostics stay intact, and legacy keys whose
arguments were discarded are preserved rather than exposing incomplete templates.
The base and Persian server bundles now both have 451 unique keys (46 added).

Security reports add Persian explanations for 53 exact rule IDs: 46 Cisco Skill
Scanner 2.1.0 core static signatures and seven repository VETTER example signatures.
These explanations supplement the original analyzer title, message and remediation;
they do not rewrite stored audit records or claim to translate arbitrary model
output. Unknown rules show a clear Persian fallback with the original evidence.
Two known scanner retry/availability failures also have Persian presentation.
Masked snippets and technical paths remain LTR; hidden originalSnippet metadata is
never rendered. The main interface resource now has 2,287 English keys and 2,291
Persian leaves, including four existing aliases; the rule catalog is separate.
The scanner guide describes this distinction.

Verification on 2026-10-15:

- Complete Java 21 reactor with dependent modules: BUILD SUCCESS, 2,231 tests
  reported, zero failures/errors and one skipped (2,230 executed). App: 1,179 with
  one skip. The 53 new diagnostic checks include actual validator output and a
  real MVC exception response negotiated with Accept-Language. After that full
  run, a narrow incomplete-template fallback was added and all 53 diagnostic
  checks passed again in a focused reactor run; the full reactor was not rerun
  after that guard.
- Complete frontend suite: 223 files / 941 tests passed. A subsequent check of
  the two landing test files passed after restoring public-link destinations.
- All 17 Persian Playwright tests passed together, including new 360px/1440px
  security-dialog checks. Original text, unknown-rule fallback, masked snippets,
  RTL and no document overflow were verified, and both screenshots reviewed.
  The landing test passed again after the public-link adjustment.
- App TypeScript, ESLint for changed files and production builds passed. The
  updated VitePress guide build passed with dead-link checks. Existing Vite
  runtime-config/chunk-size warnings remain.
- OpenAPI was freshly exported from the successful full backend run and generated
  with openapi-typescript; schema.d.ts has no diff. git diff --check passed.
- No live scanner/model invocation, SMTP, source-container redeployment or full
  staging/smoke run was performed. The backend running on port 8080 still uses
  the previous image; browser tests use source frontend and API fixtures.

## Remaining work

- Extend exact rule/message coverage when new scanner or validator versions add
  diagnostics. Arbitrary extension output and unsupported notification events need
  individual review.
- Audit remaining inline or server-generated text, role/permission branches and diagrams.
- Review RTL and mixed text on all remaining routes, including diff and diagrams,
  keyboard interaction, zoom and accessibility.
- Benchmark migration/search behavior at production scale. Local V70 migration and
  semantic-vector refresh are complete; richer morphology and joined-word
  equivalence remain outside the current normalization policy.
- Review advanced guide coverage, source-guide factual drift and theme accessibility
  strings that VitePress does not expose as locale options. Public guide publication
  is excluded by the user. Translating CLI executable help/errors is a separate task.
- Run the formal make staging/pre-PR pipeline before release. The existing local
  source Compose deployment and its API smoke checks have passed.

## Local deployment checkpoint — 2026-10-15

At the user's request, the current working tree was built and deployed to the
existing source Compose stack using compose.release.yml + compose.source.yml.
Web and backend images use source-persian-20261015; the unchanged scanner image
was reused under the same local tag. Both SKILLHUB_VERSION and the runtime service
version in ignored .env.source now identify this deployment. No public guide,
GitHub or external hosting publication was performed.

All five services are healthy. Web: http://localhost:3000; backend health:
http://localhost:8080/actuator/health. Only web/API loopback ports are published;
PostgreSQL, Redis and scanner remain inside the Compose network. The services
were stopped when this checkpoint began. Existing data volumes were retained,
even though the user explicitly allowed resetting disposable database data.

- PostgreSQL custom-format backup was taken before the upgrade and its archive
  index validated: .dev/persian-deploy/before-deploy.dump (schema 69, 25 search
  documents). Previous server/web images are retained as before-persian-20261015,
  and the previous local environment is saved in the ignored deployment directory.
- Flyway applied V70 successfully on the actual local database. The 25 existing
  search documents remain. The authenticated admin search-rebuild endpoint was
  run once successfully to refresh semantic vectors/enrichment. The deployed SQL
  function also passed a Persian spelling/diacritic/half-space normalization check.
- verify-source.ps1 passed all eight health, proxy, access-protection and real admin
  session checks, including after the service-version refresh.
- scripts/smoke-test.sh against Nginx with the real backend and explicit local
  admin credentials passed all 18 checks, zero failures. It exercised registration,
  session access, password change/logout, admin configuration and label CRUD;
  the test label was deleted. A disposable smoke user remains.
- Real Persian API checks passed: localized anonymous 401; admin login; Persian
  search; invalid-package CLI dry-run in Persian and English with no publication.
- Chromium used the deployed Nginx bundle and real API without fixtures at 360px
  and 1440px: actual admin login, discovery, fa language/RTL, loaded IRANSans,
  no document overflow, no page errors or same-origin HTTP 5xx. Switching
  fa→en→fa also passed. Both deployment screenshots were visually reviewed.

The eight deployment checks, 18 API smoke checks and live browser checks are new
runtime evidence; earlier fixture-based tests remain separate evidence. The
formal make staging orchestration, SMTP and optional OAuth/LLM integrations were
not run. Do not assume an image rollback reverses the database migration; the
pre-upgrade backup is available if a database restoration is needed.

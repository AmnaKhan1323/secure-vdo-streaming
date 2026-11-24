# Verification record

Verified on **2026-11-24** in the original Windows workspace.

## User documentation review — current update

- Expanded the README into a user-focused guide while keeping deeper sections expandable: scope/status, first run, both-provider setup, all 17 template variables, security/architecture, source/API map, testing evidence, native deployment, backup/ownership/license responsibilities, troubleshooting/FAQ, and setup checklist.
- Cross-checked the guidance against source. Clarified Prisma/seed environment loading and the migration localhost fallback, Gumlet encoding inheritance, provider revision reload/recovery, the current Bunny key comparison, E2E browser/build prerequisites, and production HSTS implications. No live credentials or provider settings were modified.
- Automated documentation checks verified relative file/heading links, documented npm script names, coverage of every template variable, and balanced expandable markup. GitHub's Markdown renderer retained **10 expandable helpers and 9 navigation heading/link pairs**.
- Strict TypeScript, zero-warning lint, **81 offline tests and 19 production Edge browser/API tests passed again**. The unchanged production build was reused; this documentation-only update did not rebuild/restart the preview or alter its data.
- Four previously skipped live checks remain deferred; no new real-provider/media, native PostgreSQL, or production certification is claimed. No project license was invented; the guide explains how to confirm terms and access ownership privately.

## Generic vdo platform wording — current update

- Replaced target-website names, URLs, and public default domains throughout the current app, README, guides, instructions, and tests with **vdo platform** wording. A full tracked-file scan found no old target-name references. Existing Git history and stored IDs were not rewritten.
- `SITE.targetName` is display-only; authentication origins and provider domains remain explicit server/operator configuration. Real Gumlet/Bunny API/player hosts, signing, and protection gates are unchanged.
- Strict TypeScript, zero-warning lint, production build, **81 offline tests**, and **19 production Edge browser/API tests passed**. The extra browser case covers generic wording on signup/login/setup; workspace footer wording is also asserted. Dependency audit reported **0 vulnerabilities**.
- GitHub's Markdown renderer retained all three expandable README helpers and the renamed **Test a vdo platform video** heading/navigation link.
- Checkpointed/backed up the ignored private database and restarted the preview with the same session secret. All fresh pre-build aggregate counts match after restart: 1 user, 2 sessions, 3 courses, 13 lessons, 1 enrollment; progress/mapping/attempt counts remain zero. No existing accounts, enrollments, identities, or provider mappings were changed.
- Live provider/media verification remains deferred by the user. Generic wording is not evidence of live playback or production integration.

## vdo platform video test — deferred by the user

- Checked development and production configuration by **presence only**: all seven provider key/scope values and both live asset IDs are missing. No private local environment file is configured; the running local database contains **0 Gumlet and 0 Bunny mappings**. No values or bearer URLs were printed.
- Attempted the credential-gated live suite: **0 passed, 4 explicitly skipped**. Real vdo platform media playback, expiry, domain restrictions, and CDN enforcement have **not** been tested.
- Public source-website information and licensing restrictions were reviewed, not used as playback evidence. Copying/sharing requires permission; no third-party video was downloaded, imported, or rehosted.
- The user selected **update the README now; do the live test later**. That future test requires authorized media, private provider configuration, and the same video's real IDs in both providers.
- Re-ran unchanged application checks: **81 offline and 18 production Edge browser/API tests passed**, strict TypeScript and zero-warning lint passed. These results establish code/application behavior, not successful playback of vdo platform videos. The existing production build was reused; no concurrent build disrupted the running preview.
- README shortened into clickable sections, six easy steps, three expandable helpers, and a clear remaining-work checklist. Provider details and live browser acceptance remain in the linked guides.

## Minimal scope verification — current release

The latest app contains only the secure-streaming test workflow for vdo platform course videos: login/signup, inline test enrollment, both actual Gumlet/Bunny players, signed playback/protection checks, expiry/access probes, saved observations, and essential admin policy/manual ID linking.

- Removed: course marketing/search/curriculum UI, standalone learning player and progress writes, URL imports, catalog browsing, and the duplicate admin playback bench. The import-only IP dependency and obsolete configuration were removed too.
- Preserved: all existing users, sessions, courses, lessons, enrollments, progress, video mappings, and attempt history. Historical tables/migrations remain; old course URLs redirect to the comparison screen. Fresh databases seed only two text-only playback/access containers, without accounts or media.
- Retained hardening: serialized provider configuration with failed-update recovery, explicit mapping ID/revisions, scope/asset identity checks, bounded SDK setup with cleanup/retry, and transaction-locked authorization. No learner-progress callback or API remains.
- Production build, strict TypeScript, and zero-warning lint: **passed**.
- Offline security/provider/SDK/database tests: **81 passed**.
- Production Edge browser/API tests: **18 passed**, including inline enrollment, both-provider denial probes, closed/unpublished courses, manual admin setup, unavailable removed APIs, and compatibility redirects.
- Dependency audit: **0 reported vulnerabilities**. One transient registry connection reset was retried successfully without disabling TLS.
- Live provider checks: **4 explicitly skipped** without private credentials/assets. No live playback, CDN, domain, or expiry acceptance is claimed.
- Same-data production preview restarted at http://localhost:3000/dashboard after an ignored private backup. All eight aggregate counts matched the pre-restart baseline (1 user, 1 session, 3 courses, 13 lessons; enrollment/progress/mapping/attempt counts remain zero). The existing session still authenticates; no extra courses, accounts, roles, or enrollments were created.
- The README is short, clickable, and expandable; exact provider instructions and remaining operator requirements are in [setup.md](setup.md) and [testing.md](testing.md).
- Published the reviewed minimal implementation as [503370c](https://github.com/AmnaKhan1323/secure-vdo-streaming/commit/503370cb3ed9ddba6b685c5035913e2b4804cb93), without force or history replacement. All 72 staged paths were reviewed; the 59 non-deleted staged files passed the private-value/artifact scan. Private local data/config, generated code, dependencies, test outputs, and unrelated files were excluded.
- GitHub Actions [Verify prototype run 45403044863](https://github.com/AmnaKhan1323/secure-vdo-streaming/actions/runs/45403044863) **completed successfully for 503370c**, independently of the older release runs: clean install, types, lint, offline tests, production build, Chromium browser/API tests, and audit on Ubuntu/Node 24 without provider secrets.

Earlier counts and learning-platform features below describe historical releases, not the current scope.

## Secure VDO Streaming release verification

The app was renamed to **Secure VDO Streaming** at the user's request. The README now includes an easy numbered usage guide and an explicit user-owned gaps checklist. Legacy course IDs, session secrets, database names, and enrolled content were not relabeled.

- Production build: **passed** for Next.js 16.4.6 after the rename and pending hardening work.
- Strict TypeScript and zero-warning ESLint: **passed**.
- Offline tests: **77 passed**, including real PostgreSQL/WASM commit-lock checks, explicit credential isolation, ordered progress, unknown provider protection, and remote authorization guards.
- Built-app browser/API tests: **16 passed**, including renamed branding, existing routes, comparison-only progress denial, unbound legacy attempts, and A→B→A mapping revision invalidation.
- Live provider tests: **4 explicitly skipped** without private credentials/assets. No live playback pass is claimed.
- Dependency audit: **0 reported vulnerabilities**.
- New migrations are additive only: attempt asset/purpose/revision binding and progress ordering. Existing attempt history remains readable; new progress requires a fresh asset-bound lesson attempt.
- The existing local database was backed up in ignored private storage and upgraded in place. Aggregate user/session/course/lesson/enrollment/progress/mapping/attempt counts were unchanged. The signed-in browser still opens the renamed app without reauthentication; no secrets, accounts, roles, or enrollments were replaced.
- GitHub CI run [45394986813](https://github.com/AmnaKhan1323/secure-vdo-streaming/actions/runs/45394986813) completed successfully for implementation commit [15ddf16](https://github.com/AmnaKhan1323/secure-vdo-streaming/commit/15ddf168cf676e1b79196ef882724972eb3fa9f1): clean install, types, lint, 77 offline tests, production build, 16 Chromium browser/API tests, and audit on Ubuntu/Node 24 without provider secrets.
- Published to the public [AmnaKhan1323/secure-vdo-streaming](https://github.com/AmnaKhan1323/secure-vdo-streaming) repository, preserving its starter history without force push. All 120 staged source/doc/config files were manually reviewed; private environment/local database/session data, generated clients, dependencies, and build/test outputs were excluded.

Earlier records below are historical. The current results above supersede their counts.

## vdo platform scope correction

The latest verified build is a **small secure-course-video test prototype for a vdo platform**, with the Gumlet/Bunny test bench as the main signed-in screen. Course pages are supporting enrollment/test containers, not a new vdo platform catalog or LMS.

- Production build, strict TypeScript, and zero-warning lint passed again after the focus correction.
- **61 offline tests passed**, including product identity/domain boundaries, paired lesson ordering, and preservation of existing course/progress/video data.
- **15 production browser/API tests passed**, including the comparison-first landing page, unchanged comparison route, both-provider access probes, and paired mappings blocked without private credentials.
- **4 live checks explicitly skipped** without actual provider credentials/assets. No successful live playback claim.
- Dependency audit: **0 reported vulnerabilities**.
- Local preview rebuilt and restarted at http://localhost:3000/dashboard. The previously signed-in browser session still works. Aggregate counts of users, sessions, courses, lessons, enrollments, progress, and video mappings were unchanged; no course expansion occurred on restart. The private session-secret file was not replaced or exposed.
- In the actual preview, both unauthenticated provider request paths returned 401 `UNAUTHENTICATED`, and both non-enrolled paths returned 403 `NOT_ENROLLED`, without playback URLs. This verifies the application gates, not external provider playback or CDN enforcement.
- The main test view had no horizontal overflow at a 1440px viewport. The 390px mobile regression also passed.

The original baseline results below are historical; the current counts above supersede them. Actual vdo platform account/entitlement integration and provider credentials are still required for live website deployment.

## Completed checks

| Check | Result |
| --- | --- |
| Production build (`npm run build`, VS Code task) | Passed: Next.js 16.4.6 compiled, TypeScript checked, all routes generated. Build ran without database/provider credentials. |
| Strict TypeScript (`npm run typecheck`) | Passed. |
| ESLint (`npm run lint --max-warnings=0`) | Passed with no errors or warnings. |
| Offline security/API-contract/SDK/database tests (`npm test`) | **56 passed**, zero failed, zero skipped. |
| Production browser/API tests (`npm run test:e2e`) | **13 passed**, zero failed; installed Microsoft Edge, isolated PostgreSQL/WASM database. |
| Dependency audit (`npm audit --audit-level=high`) | Zero reported vulnerabilities after the compatible Effect 3.22.5 override. |
| Live provider tests (`npm run test:live`) | **4 explicitly skipped** because actual credentials/assets and optional probe opt-in are absent. Zero live-provider passes are claimed. |

## Automated coverage

- Exact Gumlet HMAC-SHA1 iframe and Bunny SHA-256 embed signature inputs/query fields, with reproducible fixed-expiry vectors.
- Official HTTP API request contracts; scope IDs; async URL imports; real response sanitization; no invented Bunny fetch GUID or Gumlet update fields.
- Unknown effective protection, unready/MP4-only assets, generated MP4 access, broader domains, key mismatch, and media token bypasses fail closed.
- Authentication/enrollment precede signing; revoked authorization is rechecked; failed commit does not return a URL.
- Actual installed Player.js SDK constructors/callbacks are exercised through isolated DOM/message contract fixtures. Exact origin/source guards and per-player teardown are verified. This is **not** simulated provider playback.
- Actual PostgreSQL/WASM migration and Prisma adapter, idempotent curriculum seed, multiple client connections, interleaved transactions, rollback, foreign-key cascade, and zero seed accounts/videos.
- Built-app Better Auth signup/password login/signout, HTTP-only sessions, blocked role spoofing, actual sign-in rate limiting, CSRF/body bounds, admin access, missing-provider failure, progress ownership/monotonic writes, and enrollment revocation.
- Course search/enrollment/lesson navigation, provider switching without a fake iframe, comparison access checks, mobile navigation, and no horizontal overflow at a 390px viewport.
- App framing/referrer/nosniff/CSP headers and private no-store API responses.

## Unverified external behavior

No Gumlet/Bunny credentials, processed private assets, or provider account settings were supplied. Therefore the following are **not certified**:

- Real normal playback, browser SDK readiness/advancing time from either vendor's actual iframe.
- Provider rejection of expired/tampered signatures and wrong/missing referrers.
- Unsigned direct manifest/segment/download rejection, cached/buffered behavior, thumbnails/captions, or DRM.
- Account-specific key encoding, workspace inheritance, current/legacy player behavior, CDN propagation, quotas, or billing.
- Native/managed PostgreSQL deployment, trusted production proxy/HTTPS behavior, production identity verification/recovery, or operational retention.

Configure real test accounts privately, then follow the credentialed browser checklist in the README and `docs/testing.md`. An HTTP iframe 200, countdown, timeout, or successful build must not be recorded as secure video playback success.

## Environment

- Node.js 24.22.3, npm 11.19.1.
- Next.js 16.4.6, React 19.3.1, TypeScript 6.0.3.
- Prisma 7.10.1, Better Auth 1.7.27.
- Gumlet Player.js 3.0.11, Player.js 0.1.0 (Bunny-documented).
- PGlite 0.6.0 / pglite-socket 0.3.0 for local and isolated tests; standard PostgreSQL schema/PrismaPg adapter.

Prisma engine download used Windows' trusted certificate store through Node's `NODE_USE_SYSTEM_CA=1`; TLS verification was never disabled.
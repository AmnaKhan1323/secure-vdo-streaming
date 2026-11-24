# Verification record

Verified on **2026-11-24** in the original Windows workspace.

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

## CodeWithHarry scope correction

The latest verified build is a **small secure-course-video test prototype for codewithharry.com**, with the Gumlet/Bunny test bench as the main signed-in screen. Course pages are supporting enrollment/test containers, not a new CodeWithHarry catalog or LMS.

- Production build, strict TypeScript, and zero-warning lint passed again after the focus correction.
- **61 offline tests passed**, including CodeWithHarry identity/domain boundaries, paired lesson ordering, and preservation of existing course/progress/video data.
- **15 production browser/API tests passed**, including the comparison-first landing page, unchanged comparison route, both-provider access probes, and paired mappings blocked without private credentials.
- **4 live checks explicitly skipped** without actual provider credentials/assets. No successful live playback claim.
- Dependency audit: **0 reported vulnerabilities**.
- Local preview rebuilt and restarted at http://localhost:3000/dashboard. The previously signed-in browser session still works. Aggregate counts of users, sessions, courses, lessons, enrollments, progress, and video mappings were unchanged; no course expansion occurred on restart. The private session-secret file was not replaced or exposed.
- In the actual preview, both unauthenticated provider request paths returned 401 `UNAUTHENTICATED`, and both non-enrolled paths returned 403 `NOT_ENROLLED`, without playback URLs. This verifies the application gates, not external provider playback or CDN enforcement.
- The main test view had no horizontal overflow at a 1440px viewport. The 390px mobile regression also passed.

The original baseline results below are historical; the current counts above supersede them. Actual CodeWithHarry account/entitlement integration and provider credentials are still required for live website deployment.

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
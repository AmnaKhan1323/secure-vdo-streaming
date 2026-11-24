# Secure video streaming implementation plan

Target website: **codewithharry.com**, confirmed by the user on 2026-11-24. The current product is **Secure VDO Streaming**; CodeWithHarry and StreamLab references below are historical.

Latest user request: remove nonessential functionality from the small dual-provider streaming prototype. Retain the short interactive README and authorized **public** publication under amnakhan1323. Historical brand references below are implementation history; do not relabel existing course/lesson/session identities.

Repository inspection: the workspace was empty on 2026-11-24. Node.js 24 and npm are installed; PostgreSQL and Docker are not on PATH. No provider credentials were present or requested through chat.

## Architecture

- Next.js App Router, TypeScript, Tailwind CSS; server-rendered protected pages and Node.js route handlers.
- PostgreSQL + Prisma for Better Auth users/sessions, courses, lessons, enrollments, progress, non-secret provider settings, and playback measurements.
- Better Auth email/password authentication, database sessions, trusted-origin checks, and rate limiting. Never invent a password or session algorithm.
- Secrets exist only in server environment variables. Browser receives only authorized, short-lived signed iframe URLs.
- Every playback issuance checks the current database user, course enrollment, asset mapping/readiness, and remote provider protection. Missing configuration fails closed.

## Delivery checklist

- [x] Inspect repository and available tools.
- [x] Research official Gumlet, Bunny, and Better Auth documentation.
- [x] Write implementation plan before scaffolding.
- [x] Scaffold app and install dependencies — manual standard configuration after the scaffolder refused the pre-existing required plan; Next.js 16.4.6, Prisma 7.10.1, Better Auth 1.7.27.
- [x] Implement database schema, sample curriculum, authentication, and authorization.
- [x] Implement documented provider API adapters and exact iframe signatures.
- [x] Build responsive dashboard, curriculum, player, admin, and comparison UX.
- [x] Add validated API routes, progress persistence, security headers, and instrumentation.
- [x] Add environment template, database startup, README, and testing guide.
- [x] Run offline security/adapter tests, type checking, linting, production build, and browser checks — 56 offline tests + 13 production E2E checks passed; dependency audit clean.
- [x] Run credential-gated live tests, or record them explicitly as skipped without credentials — 4 live checks skipped, not claimed as successful provider playback.

## Provider decisions and limitations

- Gumlet: follow its published Base64-decoded HMAC-SHA1 iframe example; sign the exact relative embed path and query with absolute Unix-second `signed_expires`. Never reuse direct HLS signing. Document the official prose/example key-encoding discrepancy.
- Gumlet APIs use `/v1/video/workspaces` and `/v1/video/assets`; create from an accessible source URL with `workspace_id`. Disable MP4 access for imported protected videos.
- Bunny: SHA256 hexadecimal over `tokenSecurityKey + videoId + expiration`, using absolute Unix seconds. Default to the current `player.mediadelivery.net` host; legacy host remains explicit opt-in.
- Bunny content API uses per-library AccessKey; library/security management requires a separate Core API credential. Never return raw management responses (they may contain secrets).
- Domain restrictions and embed authentication do not replace CDN/HLS protection or DRM. Verify the actual library/pull-zone protection and document remaining account/browser checks.
- Bunny fetch-by-URL returns a status model without a documented video ID. Do not invent a GUID response or attach fetch to a separately created slot. Import by URL, then explicitly select the resulting asset from the real provider catalog.
- Player.js events measure readiness and advancing playback separately. Iframe load is not playback success. Never fabricate comparison metrics or expiry results.
- No fake playback, seed video IDs, fallback API data, automatic administrator signup, or plaintext default passwords.
- Gumlet's GET response documents `enable_download_button`, but its workspace update body does not. Disable that button manually; only documented signed-URL/referrer fields are sent by the app.
- Gumlet key representation is explicit (`base64` default, confirmed `hex` opt-in); remote key representation can be configured separately. Both decode to bytes for comparison; encoding is never guessed.
- Unknown effective Gumlet asset signing or adaptive output fails closed. Obtain a provider-confirmed effective state if your API omits the asset flag.
- Remote referrer lists broader than the approved local policy block playback. Bunny extras are not silently deleted: remove them in its console or intentionally approve them locally.
- Revalidate session, role, and enrollment after upstream calls, and lock enrollment before token commit. Existing provider tokens remain bearer URLs until their provider expiry; revocation is not instant for previously issued URLs.

## Verification boundaries

Unit/contract tests use explicit fixtures to check official request shapes, cryptographic signatures, authorization, validation, and sanitization; fixtures never replace runtime providers. Live API and browser playback tests need private credentials, real processed assets, matching allowed domains, and correctly enabled protections. Missing values must produce clearly labeled skips/configuration errors, not claimed passes.

## CodeWithHarry continuation

The user clarified the scope: a **small Next.js secure-video comparison prototype for codewithharry.com courses**, not a new LMS or expanded curriculum. Existing branding/curriculum work is retained without modifying stored course identities. No additional curriculum is added to an existing database during this correction.

- [x] Inspect the partially updated source and the still-running older preview.
- [x] Make the signed-in landing page the Gumlet/Bunny streaming test bench; retain existing route compatibility.
- [x] Keep CodeWithHarry identity, but describe this as a streaming-test prototype rather than an integrated coding classroom.
- [x] Keep only comparison, test-course enrollment, and provider setup in primary navigation. Preserve all existing accounts/content/progress/mappings.
- [x] Prioritize enrolled lessons mapped to both providers and require both mappings for the paired run. Show missing credential/configuration states explicitly.
- [x] Test the real authentication and enrollment denial paths for both providers, without fabricating playback results.
- [x] Document the focused workflow and exact codewithharry.com/www deployment boundaries. Do not change real provider domains automatically.
- [x] Pass types, lint, offline tests, production build, and browser tests — 61 offline and 15 production browser/API tests passed; four live checks explicitly skipped; dependency audit clean.
- [x] Restart the local production preview with the same private session secret and persistent database — existing signed-in browser session and aggregate record counts unchanged; no curricula inserted on restart.

## Remaining credentialless completion pass

User requested all actionable remaining work; keep the prototype small and never fabricate live streaming.

- [x] Isolate tests with explicit empty provider credentials so Next cannot reload private environment values.
- [x] Lock and recheck session/role, enrollment, mappings, and local provider policy at playback commit.
- [x] Bind new attempts to the verified asset; separate comparison observations from lesson progress and reject stale progress writes.
- [x] Reject unknown provider protection/key state rather than assuming safety.
- [x] Revalidate admin privileges around provider waits and make mapping replacements/status updates explicit.
- [x] Add regression tests for the new transaction and browser workflow boundaries.
- [x] Keep admin promotion/enrollment an explicit existing-account workflow documented in README; do not modify the user's current role or enrollments merely for publishing.
- [x] Rebuild, test, restart the same local database/session, and document precisely what still requires private provider access.

## Rename and GitHub publication

- [x] Rename visible product, metadata, package, and tasks to Secure VDO Streaming.
- [x] Add easy numbered usage instructions and the user-owned credentials/media/provider/production gap checklist.
- [x] User selected public repository visibility; review all source/config/docs before publishing.
- [x] Finish the already-started hardening tests and pass the production build/browser suite — 77 offline + 16 E2E tests, strict types/lint, clean build/audit; four live checks skipped.
- [x] Preserve the private preview database/session during additive migrations and restart; existing browser session and all aggregate record counts unchanged.
- [x] Stage only project source/docs/config; reviewed all 120 staged files and secret-safe scan; private environment/local data, generated code, dependencies, build/test outputs, and unrelated files excluded.
- [x] Publish to the public amnakhan1323/secure-vdo-streaming repository using the authorized account. Preserve its starter commit; reviewed implementation pushed as 15ddf16 without force.
- [x] Verify rendered GitHub README and uploaded source. GitHub Actions Verify prototype run 45394986813 completed successfully for implementation commit 15ddf16.

## Final completeness review and short interactive README

- [x] Serialize provider configuration operations, block issuance during changes/partial failures, and provide a safe retry/recovery path.
- [x] Replace timestamp-only mapping authority with an explicit mapping ID/revision binding; verify upstream asset identity.
- [x] Bound player SDK setup, clean up partial failures, and expose retry. Progress flushing is superseded by the latest request removing all learning-progress functionality.
- [x] Clear stale provider reports on edits, reconcile refreshed mapping displays, and close local database resources on startup failure.
- [x] Replace the long README with a short clickable quick start, expandable setup/checks, and a clear remaining-user checklist; retain technical details in docs.
- [x] Add regression tests and rerun local build/types/lint/offline/browser/audit checks — 81 offline + 18 E2E passed; publication/preservation tracked below.
- [x] Observe GitHub CI separately — minimal implementation 503370c passed Verify prototype run 45403044863. Do not confuse code completion with credentialed provider/production acceptance.

## Latest request: remove nonessential functionality

- [x] Keep only authentication/enrollment, both real provider players, signed playback/protection checks, test observations, and essential admin policy/manual linking.
- [x] Remove course marketing/search/curriculum screens, learner progress writes, URL imports/catalog browsing, and the duplicate admin playback bench.
- [x] Put compact course-enrollment controls on the comparison screen. Keep old course URLs as redirects; preserve all existing database records and identities.
- [x] Bootstrap only two text-only test containers on a fresh database, not full web/Python/DSA curricula. Existing data is never overwritten or deleted.
- [x] Validate retained security and minimal workflows, update the short interactive README, and safely restart the same preview. All eight aggregate record counts match the pre-restart baseline; the same signed-in session still authenticates.
- [x] Publish reviewed minimal source and separately observe the new GitHub CI run — implementation 503370c pushed without force; run 45403044863 completed successfully.
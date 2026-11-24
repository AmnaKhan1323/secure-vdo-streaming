# Verification and provider acceptance guide

## Secure VDO Streaming workflow

Start on the signed-in **Video comparison** screen. Both Gumlet and Bunny slots are visible; select an enrolled test lesson linked to both real providers. Paired lessons are prioritized, and the paired-run button requires both mappings and configured/enabled providers. No video is invented if those prerequisites are missing.

Use **Course access** directly on the comparison screen for enrollment. Use admin **Provider setup** for credentials-status checks, manual verified video linking, and protection settings. Uploads/catalog management stay in the provider consoles. The prototype is not connected to existing vdo platform identities, paid entitlements, or course media.

The authentication/enrollment probe buttons call **both provider paths** and accept a pass only when both return the expected status and error code without a playback URL. Comparison attempts record diagnostics only; they cannot change lesson progress. The original provider acceptance checks below remain required after private configuration.

## What automated checks establish

- Cryptographic fixed vectors match the official published algorithm inputs/encodings. They are test-derived constants, not vendor-issued certification.
- HTTP contract fixtures verify documented asset/protection paths, methods, headers, and secret-free DTOs. Runtime always uses actual provider APIs.
- Unauthorized viewers, missing enrollment, revoked authorization, unsafe requests, unknown protection, extra domains, and MP4 exposure fail closed.
- Commit locks recheck identity/session, enrollment, mapping revision, and provider policy after remote work; changed local state prevents stale issuance. Session expiry is checked again after lock waits/writes.
- Learner-progress/import/catalog APIs are retired and unavailable; historical course/progress data is preserved. Tests verify the retained app cannot mutate that progress through removed routes.
- Real PostgreSQL/WASM migration/Prisma adapter tests establish schema/seed behavior; native PostgreSQL still needs deployment verification.
- End-to-end tests run the built application with real Better Auth/Prisma, not mocked sessions or routes.
- A successful production build is separate from successful live provider playback.

## Live credentials

Configure server environment variables privately as described in the README. No API key input is accepted through the frontend. Set the optional live asset IDs to real, processed assets in the configured workspace/library. Tests are read-only and skip with an explicit reason when configuration is absent.

For a **vdo platform video test**, use a creator-authorized file or assets you are permitted to use. Public/free viewing does not automatically grant copying, sharing, or re-upload permission. A website or YouTube URL is not a Gumlet asset ID or Bunny video GUID, and this prototype does not scrape/import third-party videos. Upload the same authorized file into both configured scopes, link both IDs to one lesson, and set `LIVE_GUMLET_ASSET_ID` / `LIVE_BUNNY_VIDEO_ID` privately to those assets. Do not record a vdo platform playback pass until that actual media has passed the browser checks below.

1. Choose a controlled test scope. Review consequences before enabling shared token protection.
2. Configure the same media file on both providers; record codec/resolution/duration differences.
3. Enable strict allowed domains, embed signing, media/CDN protection, and disable downloadable/original/MP4 bypasses.
4. Run live API configuration tests and inspect the app's whitelisted protection report.
5. Complete the browser checks below; do not treat an API success as video success.

## Browser playback evidence

For each provider record app origin, browser/version, foreground-tab state, account/library settings, scenario, and timestamp. Never record signing keys or complete bearer playback URLs in shared artifacts.

| Scenario | Required evidence | Not sufficient |
| --- | --- | --- |
| Normal | Real ready/play events and advancing media time; successful manifest/segments | Iframe HTTP 200 or `load` |
| Unauthenticated | API 401 `UNAUTHENTICATED`, no embed URL | Generic network failure |
| Not enrolled | API 403 `NOT_ENROLLED`, no embed URL | Origin 403 |
| Expired signature | Actual provider error/HTTP denial for a new player/media request | Application countdown reaches zero |
| Tampered signature | Actual provider denial and no media playback | Timeout with unknown cause |
| Wrong domain | Rejected provider request with disallowed `Referer` | Local app origin check only |
| Direct unsigned media | Both unsigned manifests and segment requests denied | Embed authentication alone |
| Renewal | Fresh authorized token and successful resumed playback | New URL generation alone |

Use developer tools privately for provider HTTP statuses. The app cannot inspect the cross-origin frame's response or DOM. A timeout is inconclusive: hidden tabs, content filters, unsupported SDK events, wrong player host, and network errors can all delay readiness.

Already-expired/tampered admin probes keep the real iframe mounted to observe provider behavior. Ordinary playback removes it at the conservative application deadline and offers renewal. That removal must **not** be recorded as a provider rejection. To test provider expiry during existing buffered playback, use a controlled external browser test of the authorized URL and distinguish buffered rendering from new media requests; do not share that bearer URL.

## Gumlet-specific diagnostics

- Confirm both local and API-returned secret encodings. Published prose says hexadecimal; its JavaScript code decodes Base64. The application requires explicit encodings and compares decoded bytes.
- The provider must return a verifiable current signing key; a missing key is not treated as a successful match.
- Confirm effective asset `video_protection.signed_url=true`. If omitted, request an authoritative value from Gumlet rather than weakening the gate.
- `output.format` must be adaptive and `mp4_access` explicitly false. Existing profile settings or previously generated MP4s may override assumptions.
- Disable the download button manually; its update parameter is not in the published workspace request schema.
- Preserve exact embed query order/encoding. Any extra query parameter must be included before HMAC signing.
- Do not confuse signed iframe fields (`signed_token`, `signed_expires`, Unix seconds) with direct-media or DRM token fields.

## Bunny-specific diagnostics

- Stream content uses the per-library Stream API key. Library/Pull Zone checks require Core API access, not the same key by assumption.
- Embed hash is SHA-256 of key + video GUID + Unix-second expiry. CDN signatures are different. Confirm both protection layers.
- Match player host to `PlayerVersion`: current host is version 2; explicit legacy is version 1.
- Review existing referrers. Remote-apply only adds them; extra unapproved hostnames block app playback until reconciled.
- Inspect Pull Zone rules for token-auth bypasses and existing generated MP4/original exposure.
- Omitted/null edge rules or early-play state are unknown, not safe defaults; unknown key/protection state blocks playback.
- Upload the authorized video in Bunny's console and copy its actual GUID for manual linking. The comparator does not implement imports or invent video IDs.

## Performance interpretation

Token API round trip includes authentication, database work, both provider API checks, signing, and the final persistence step. Server issuance excludes final commit. Player readiness is measured from iframe mounting after the SDK loads. “Playback observed” uses advancing media time while playing; it is not a direct decoded-frame timestamp and includes user click delay. Do not call it a network-only time-to-first-frame benchmark.

Run repeated trials with comparable encodings, same content/network/browser, and foreground tabs. Two simultaneous players compete for bandwidth. Use sequential runs as well. Missing metrics remain null; zero is a real measured value, never a default.

## Verification record

The final implementation run updates `docs/verification.md` with build/type/lint/unit/E2E/live outcomes and explicit skipped credential-dependent checks. No live playback certification is implied by offline or build results.
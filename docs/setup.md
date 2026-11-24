# Setup and provider reference

Start with the [README handover guide](../README.md). This page holds the detailed configuration, signing, and production notes.

## Local development

Use Node 22.12+ (Node 24 recommended). On Windows use `npm.cmd`; on macOS/Linux use `npm`.

```powershell
npm.cmd ci
npm.cmd run db:generate
npm.cmd run dev:local
```

Open http://localhost:3000/signup, create a test account, then promote that **existing** account in a second terminal:

```powershell
npm.cmd run admin:promote -- --local --email your-email@example.com
```

Refresh the app. Use **Course access** on the comparison screen to enroll in the playback test course. Admins must still enroll before playback. Fresh databases include one open playback fixture and one closed fixture for testing enrollment denial; existing course data is not changed.

The local launcher uses PostgreSQL compiled to WASM (PGlite) with PrismaPg, binds app/database to loopback, applies additive migrations, and bootstraps two text-only test containers into an empty course database. The ignored **.local** folder keeps your private database/session secret; protect it with OS permissions and do not delete it if you want to retain data. No default accounts/videos/keys are created. Two database connections allow the app plus admin CLI. Native PostgreSQL deployment/concurrency acceptance is still required for production.

## Private environment configuration

Create **.env.local** in your editor using [the template](../.env.example). For `dev:local`, leave `DATABASE_URL`, `POSTGRES_PASSWORD`, and `BETTER_AUTH_SECRET` empty; keep `BETTER_AUTH_URL=http://localhost:3000`. The launcher reuses its private auth secret. Restart the server after editing configuration.

| Provider | Required server variables |
| --- | --- |
| Gumlet | `GUMLET_API_KEY`, `GUMLET_WORKSPACE_ID`, `GUMLET_SIGNING_SECRET` |
| Bunny | `BUNNY_STREAM_API_KEY`, `BUNNY_LIBRARY_ID`, `BUNNY_TOKEN_AUTH_KEY`, `BUNNY_CORE_API_KEY` |

Gumlet key encodings are explicit: `GUMLET_SIGNING_SECRET_ENCODING` defaults to `base64`; when unset, `GUMLET_REMOTE_SECRET_ENCODING` inherits that local encoding. Choose `hex` only after confirming the representations with Gumlet. Bunny's Stream API key, Core API key, and token authentication key are distinct credentials. `BUNNY_PLAYER_HOST=player.mediadelivery.net` defaults to the current player.

Never put credentials in client code, `NEXT_PUBLIC_*`, video titles, source URLs, screenshots, logs, or chat. Private environment/local data are ignored by Git; the template contains no live credentials. Signed playback URLs are also bearer credentials: do not share or log them.

## Gumlet protection and APIs

1. Create a Video workspace and scoped API key; use a dedicated test scope first.
2. Enable **Signed URL** and **Whitelist Referrers**; approve the actual embedding hostname. Confirm `localhost` support with your account.
3. Manually disable the download button. Its GET field is documented, but the workspace update request does not document that field; the app does not invent an update parameter.
4. Use adaptive ABR/HLS/DASH assets, not MP4-only output. Require explicit `mp4_access=false`, effective asset `video_protection.signed_url=true`, and a verifiable matching workspace key. Unknown values fail closed. Review existing profiles/assets; hiding a button does not remove generated MP4s.
5. In **Provider setup**, configure the same hostname policy and TTL, then enable/save/check configuration.

**Exact iframe algorithm:** HMAC-SHA1 over the exact relative embed path + existing serialized query + `signed_expires=<absolute Unix seconds>`, hexadecimal digest in `signed_token`. The host is not signed; every additional query parameter is included before signing. This differs from Gumlet direct-media and DRM signatures.

The official prose describes a hex secret, while its JavaScript example Base64-decodes it. The app never guesses; confirm local and API-returned representations separately. The offline vector follows the published algorithm, not vendor-issued certification.

Official references: [signed URLs](https://docs.gumlet.com/video/manage-videos/video-protection-settings-section#signed-url), [asset details](https://docs.gumlet.com/reference/tag/video-assets/get/video/assets/asset_id/index.md), [get workspace](https://docs.gumlet.com/reference/tag/video-workspaces/get/video/workspaces/workspace_id/index.md), [update workspace](https://docs.gumlet.com/reference/tag/video-workspaces/post/video/workspaces/workspace_id/index.md), [Player.js](https://docs.gumlet.com/developers/video-player/playerjs), [MP4/expiry limitations](https://docs.gumlet.com/video/manage-videos/video-protection-settings-section/time-based-expiry-urls).

## Bunny protection and APIs

1. Create a test Stream library; configure its per-library Stream API key and separate token-authentication key.
2. Supply a suitably scoped **Core API key** to inspect/update the library and linked Pull Zone. Do not assume the Stream key grants those permissions.
3. Enable **Embed view token authentication** and linked Pull Zone **CDN token authentication**. An iframe token alone does not protect direct media.
4. Restrict allowed referrers, block missing referrers, and disable direct play, early play, MP4 fallback, and original exposure. Inspect existing downloadable files and token-bypass edge rules. Unknown rules/key/early-play states fail closed.
5. Current host `player.mediadelivery.net` requires `PlayerVersion=2`. Explicit legacy `iframe.mediadelivery.net` requires version 1 and is scheduled for removal in early 2027.
6. Save/check the same local hostname/TTL policy in **Provider setup**.

The current adapter verifies `BUNNY_TOKEN_AUTH_KEY` against the linked Pull Zone's returned `ZoneSecurityKey`. A missing/different key fails closed. Confirm that your account's embed/CDN key configuration is compatible with this check; do not assume separate keys are interchangeable or weaken verification without provider-confirmed evidence and tests.

**Exact iframe signature:** SHA-256 hex of `tokenAuthenticationKey + videoId + decimalUnixExpirySeconds`, no separators. URL query is `token`/`expires`; library ID is in the path, not the hash. This is not Bunny's CDN signing algorithm.

Official references: [token authentication](https://bunny.net/docs/stream/token-authentication.md), [signed embeds](https://bunny.net/docs/stream/player/signed-embeds.md), [security layers](https://bunny.net/docs/stream/security.md), [get video](https://bunny.net/docs/api-reference/stream/manage-videos/get-video.md), [library settings](https://bunny.net/docs/api-reference/core/stream-video-library/update-video-library.md), [add referrer](https://bunny.net/docs/api-reference/core/stream-video-library/add-allowed-referer.md), [Pull Zone settings](https://bunny.net/docs/api-reference/core/pull-zone/update-pull-zone.md), [Next.js/player integration](https://bunny.net/docs/stream/player/nextjs.md).

## Provider changes and recovery

Enter hostnames without scheme/path/port, for example `localhost` or `courses.example.com`. Empty/unrestricted or broader remote lists are rejected. Gumlet remote-apply replaces its referrer list; Bunny only adds entries, so remove unapproved extras manually or intentionally approve them locally. No signing keys are rotated.

Provider changes are serialized per scope in the app. Before any remote mutation, the local provider is marked **updating and disabled**. Playback commits check mapping/provider revisions, so an older remote report cannot authorize a changed policy. A partial failure stays **failed and disabled** and advances the revision. Inspect/fix the provider console, use **Reload saved settings** or refresh, review/re-enter the intended policy, re-enable playback, and Save. Enabling recovery requires a fresh remote report. A crashed operation can be taken over after 10 minutes; an old owner cannot complete or disable its replacement.

Remote APIs are not transactional. Already-in-flight provider work and changes made directly in a vendor console cannot be atomically undone by this app. Existing signed URLs remain bearer URLs until provider expiry; enrollment revocation prevents new issuance, not instant revocation of old URLs.

## Upload/link a real video

Upload the same authorized file in both provider dashboards and wait for encoding. In **Provider setup → Link test videos**, select the same lesson twice and link its real Gumlet asset ID and Bunny GUID. Replacement requires explicit confirmation; mapping IDs and incrementing revisions prevent stale authorization even if a video changes A→B→A in the same millisecond.

Video upload/import/catalog management stays in the vendor consoles. The app only verifies and links the actual IDs, then compares authorized playback. It does not provide browser uploads, URL imports, course-authoring features, or generated media.

## Standard PostgreSQL and deployment

Use an existing native/managed PostgreSQL service or the included [Compose configuration](../compose.yaml). Configure `DATABASE_URL`, a random `BETTER_AUTH_SECRET` of at least 32 characters, and the exact `BETTER_AUTH_URL` origin privately. Compose uses user/database `streamlab`; set `POSTGRES_PASSWORD` and use a matching URL-encoded password in the database URL.

For this mode, create **.env** from [the template](../.env.example), or inject real process environment values. Prisma migrations and the standalone seed load **.env**, not automatically **.env.local**. Next.js also supports **.env.local**, but avoid conflicting copies: the local/admin/live helpers and Prisma do not all follow Next.js file precedence, and existing shell variables take precedence. Do not run migration/seed against an unintended database just because the app can connect.

Explicitly set and verify the intended `DATABASE_URL` before migrating. [Prisma configuration](../prisma.config.ts) uses a localhost fallback when the variable is unset, so a migration may try that database instead of failing for missing configuration. The standalone seed and runtime require the URL; generation/build do not need a live database.

```powershell
docker compose up -d
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

Docker is optional. Omit `--local` from `admin:promote` for the configured PostgreSQL database. Do not change an initialized database password by editing Compose alone. Production uses `npm.cmd run build` then `npm.cmd start`. Stop a dev server before building because both share **.next**. For a built local preview use `npm.cmd run dev:local -- --production`.

The evaluation target is a **vdo platform**, not an automatic identity/media integration. Before live-site use, connect its authorized authentication and course-entitlement system. The apex and `www` are separate hostnames; choose a canonical HTTPS origin and approve only actual embedding domains. Naming this app never writes production origins or vendor policies automatically.

Production also needs trusted proxy headers, native PostgreSQL concurrency verification, backup/retention/monitoring, email verification/recovery/MFA as appropriate, privacy review, and a reviewed nonce-based CSP. The prototype's CSP permits inline hydration scripts/styles; it is not a production certification. No DRM is configured and authorized screen recording cannot be completely prevented.

Production responses also set a one-year HSTS policy with `includeSubDomains`. Review HTTPS readiness for the selected hostname and affected subdomains before serving it; browsers can retain this policy.

## Tests and troubleshooting

Run `npm.cmd run check` (types, lint, offline tests, build), then `npm.cmd run test:e2e`. E2E starts the already-built app with isolated data on ports 3001/15438. Windows uses installed Edge by default; Linux/macOS use Playwright Chromium (`npx playwright install chromium`). To use downloaded Chromium on Windows, set `PLAYWRIGHT_CHANNEL=chromium`; it can also select another installed supported channel. Linux may need `npx playwright install --with-deps chromium`. Offline tests use fixtures and E2E explicitly blanks provider keys; neither substitutes fallback runtime streams.

Run `npm.cmd run test:live` separately when private real credentials and `LIVE_GUMLET_ASSET_ID` / `LIVE_BUNNY_VIDEO_ID` are available. These read-only real-provider checks skip explicitly without their prerequisites. Optional `LIVE_EMBED_PROBES=true` checks iframe HTTP shell reachability only; HTTP 200 is not playback. Follow [browser acceptance](testing.md), not just automated pass counts.

- Missing keys/mappings: configure server values, restart, and link both real videos.
- Invalid Gumlet encoding or unverified asset protection: confirm authoritative account/API state; do not weaken the gate.
- Wrong Bunny player host: match the library's PlayerVersion.
- Configuration updating/failed: inspect partial changes, then retry recovery as described above.
- SDK loading/init failure: use **Retry player setup**; 25-second readiness timeouts remain inconclusive, especially in hidden tabs.
- Expired token: renew and reauthorize; the normal player is removed at a conservative deadline. Negative probes leave it mounted to observe real vendor behavior.
- Prisma corporate TLS errors on Node 24: use `NODE_USE_SYSTEM_CA=1`; never disable TLS validation.

The app records test observations only. It has no learner-progress UI/API and never writes completion/resume state. Historical progress and course records remain in the database to preserve existing data; older course/lesson URLs redirect to the comparison screen. Renewal creates a new authorized test session rather than resuming a learning journey.
# Secure VDO Streaming

A **small Next.js app for testing secure course-video streaming with both Gumlet and Bunny Stream**. Use the same authorized video on both providers, then compare playback, loading observations, authentication, and token expiry.

This is a test prototype, not a new LMS or a production-ready streaming service. It was originally made to evaluate course streaming for codewithharry.com, but the app's name is **Secure VDO Streaming**. It does not connect to that website's real accounts, paid enrollments, or official videos.

**No playable sample videos, API keys, shared passwords, or automatic administrator accounts are supplied.** Missing configuration produces an explicit error; runtime never substitutes a mock or public fallback stream.

## What is already built?

- Signup/login/logout and protected pages.
- Course enrollment checks before issuing any video URL, including for admins.
- Real Gumlet and Bunny APIs and short-lived signed URLs created on the server.
- Side-by-side comparison, a lesson provider switcher, loading/error states, and expiry renewal.
- Admin provider-policy settings, real video catalogs, trusted URL imports, and video linking.
- Saved browser observations and lesson progress. **Comparison runs do not change lesson progress.**
- Automated security, API-contract, database, and browser tests.

## Easy step-by-step guide

### Step 1: Install and start the app

Install **Node.js 22.12 or newer** (Node 24 recommended), download/clone this repository, and open a terminal in its folder. Run:

```powershell
npm.cmd install
npm.cmd run db:generate
npm.cmd run dev:local
```

Open **http://localhost:3000/signup**. On macOS/Linux, use `npm` instead of `npm.cmd`.

The easy local launcher includes a PostgreSQL/WASM development database, so **Docker is not needed**. It creates a private random auth secret once, reuses it on restart, and adds text-only course/lesson containers only to an empty course database. It does not create accounts or provider credentials.

Keep the private ignored `.local` folder if you want to retain your accounts, sessions, courses, progress, and mappings. The launcher refuses to run if `DATABASE_URL` is configured; leave it empty for this local option.

### Step 2: Create an account and make it an admin

1. Sign up with your name, email, and a password of at least 12 characters.
2. Keep the app running, then open a **second terminal** in the project folder.
3. Promote that existing account using the same signup email:

```powershell
npm.cmd run admin:promote -- --local --email your-email@example.com
```

4. Refresh the browser. **Provider setup** should appear in the sidebar.

This is a local administrative command, not an admin-signup shortcut. It never creates a default account or password.

### Step 3: Add private credentials from your own accounts

1. Create your own **Gumlet Video** and **Bunny Stream** accounts. Use dedicated test scopes first; provider encoding, bandwidth, and protections may cost money.
2. Create `.env.local` in the project root using your editor. Use `.env.example` as a guide.
3. For `dev:local`, leave `DATABASE_URL`, `POSTGRES_PASSWORD`, and `BETTER_AUTH_SECRET` empty; the launcher manages local database/auth setup. Keep `BETTER_AUTH_URL=http://localhost:3000`.
4. Fill these variables privately:

| Variable | What to enter |
| --- | --- |
| `GUMLET_API_KEY` | Your scoped Gumlet Video API key. |
| `GUMLET_WORKSPACE_ID` | The workspace containing your test video. |
| `GUMLET_SIGNING_SECRET` | Its signed-playback secret. |
| `GUMLET_SIGNING_SECRET_ENCODING` | `base64` by default; choose `hex` only after confirming the account's key format with Gumlet. |
| `GUMLET_REMOTE_SECRET_ENCODING` | The key format returned by the workspace API; confirm independently if needed. |
| `BUNNY_STREAM_API_KEY` | The per-library **Stream API key**. |
| `BUNNY_LIBRARY_ID` | Your Stream library ID. |
| `BUNNY_TOKEN_AUTH_KEY` | The library token-authentication key, **not** its Stream API key. |
| `BUNNY_CORE_API_KEY` | A scoped Core API key able to read/configure the library and linked Pull Zone. |
| `BUNNY_PLAYER_HOST` | `player.mediadelivery.net` for the current player. |

5. Save the file, stop the server with **Ctrl+C**, and restart `npm.cmd run dev:local` so the process gets the new configuration.

**Never paste secrets into the frontend, screenshots, chat, GitHub, video titles, or URLs.** Private environment files and `.local` are ignored by Git. The UI shows missing variable names only. You can test account/enrollment behavior without provider keys, but **real playback cannot run without them**.

### Step 4: Enable protection in each provider

**Gumlet:** enable Signed URL, set Whitelist Referrers to your real embedding hostname (for local tests, confirm `localhost` support), manually disable the download button, and use adaptive ABR/HLS/DASH assets with MP4 access disabled. Check existing asset/profile settings too.

**Bunny:** enable Embed view token authentication **and** linked Pull Zone CDN token authentication. Configure allowed referrers, block missing referrers, and disable direct play, MP4 fallback, early play, and original exposure. Review previously generated MP4/original files and token-bypass edge rules.

In **Provider setup**, set the same approved hostnames and a token TTL (300 seconds is a useful default), enable authorized playback, save, then click **Check live configuration** for each provider.

Enter hostnames like `localhost` or `courses.example.com`—**no scheme, path, or port**. Branding never automatically grants a production domain access. A matching provider configuration report is not proof that an actual video plays.

The remote-apply checkbox makes real shared provider changes; enable it intentionally. Gumlet's download-button update field is not in the published request schema, so the app does not invent it. Multi-call remote changes are not atomic: check the provider console if a step fails.

### Step 5: Upload and link the same authorized video twice

1. Use a video you own or have permission to use. Upload the same file in both providers' consoles and wait for processing to finish.
2. Copy the real **Gumlet asset ID** and **Bunny video GUID**.
3. Open **Provider setup → Your video library → Link an existing video**.
4. Choose a lesson, select Gumlet, enter its asset ID, and click **Verify & link video**.
5. Select Bunny Stream, choose the **same lesson**, enter its GUID, and verify/link it.
6. For an existing mapping, explicitly confirm replacement. Old attempts cannot save progress against a replacement mapping.

You can also select videos from the real paginated catalog. There is no browser file-upload feature here; use provider consoles or the optional trusted URL import.

For URL imports, configure `VIDEO_IMPORT_ALLOWED_HOSTS` privately with media hosts you control. Use a direct public HTTPS video URL without inline credentials, query parameters, fragments, or custom ports. Gumlet returns an asset ID. **Bunny's documented fetch response does not provide a reliable GUID**: refresh the catalog after processing and select the resulting video. No GUID is invented.

### Step 6: Enroll the viewer and compare playback

1. Open **Test courses**, choose the course containing the linked lesson, and click **Enroll in this course**. Admins must enroll too.
2. Return to **Video comparison** and choose the enrolled lesson linked to both providers.
3. Choose **Normal signed playback** and click **Run both providers**. Missing mappings/credentials keep that button disabled.
4. Press play inside each iframe if the browser requires a click.
5. Compare token API time, iframe load, SDK readiness, and advancing media time. Refresh afterward to reload **Saved test runs**.
6. Use the access-test buttons to verify both application playback paths reject missing sessions/enrollment. The enrollment test needs a course you have not enrolled in.
7. Admins can try 60-second, already-expired, and tampered-signature scenarios. Check actual provider/media errors; an app countdown or timeout is not proof of rejection.

Use the normal lesson page for progress and renewal/resume. Comparison runs record diagnostics only and leave lesson progress untouched. Progress is self-reported, not proof of attentive viewing or a source of paid entitlement decisions.

### Step 7: Understand the results

| Observation | Meaning |
| --- | --- |
| Token API round trip | Browser time for the complete authorized request. |
| Iframe loaded | Navigation completed; **not proof the video played**. |
| Player ready | The official SDK accepts commands; **not proof the video played**. |
| Playback observed | Media time advanced while playing; includes click delay and is not an exact decoded first-frame timestamp. |
| Expired | The application removed the normal player at its deadline; **not proof of provider/CDN enforcement**. |

Missing data says **Not measured**, not zero. Simultaneous players share bandwidth; repeat sequentially for meaningful performance comparisons.

## What the user still needs to do—the gaps

| Gap | Your action |
| --- | --- |
| Credentials/account access | Create/configure your Gumlet/Bunny accounts and privately supply the real API/signing keys yourself. |
| Actual media | Supply an authorized video, upload it to both providers, and link the same lesson to both real IDs. |
| Effective protection | Verify signing-key representations, effective asset protection, domains, CDN tokens, and disabled MP4/download/original bypasses. Unknown states intentionally block playback. |
| Real playback | Test both actual players in desktop/mobile browsers, including errors, quality, renewal, and network conditions. |
| Expiry/domain/CDN acceptance | Verify expired/tampered/wrong-domain requests and unsigned manifests **and segments** are rejected by providers. Offline tests/countdowns do not establish this. |
| Existing website integration | Connect your real website authentication and paid-course entitlements before production use. No official integration endpoint is assumed. |
| Production hosting | Deploy with HTTPS, native/managed PostgreSQL, secret storage, exact app origin, trusted proxy headers, and approved provider hostnames. **GitHub upload is not deployment.** |
| Production identity/recovery | Add email verification, password-reset delivery, recovery, and MFA if required; they are not configured here. |
| Operations | Add backups, monitoring, retention, billing/quota management, privacy review, and native PostgreSQL concurrency verification. |
| Stronger content protection | Evaluate DRM separately. Signed URLs and referrers are not DRM and cannot prevent authorized screen recording. |

Previously issued signed URLs remain bearer URLs until provider expiry. Revoking enrollment prevents new issuance, not instantaneous revocation of already-issued tokens.

**The code is a working prototype ready for credentialed testing, not certified for production.** Live tests explicitly skip without credentials/assets. See [docs/testing.md](docs/testing.md) for acceptance steps and [docs/verification.md](docs/verification.md) for actual test evidence.

## Technical setup and reference details

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4.
- Node.js route handlers; Zod-validated request bodies; Better Auth database sessions and password hashing.
- Prisma 7 + PostgreSQL via the official PostgreSQL driver adapter.
- Official Gumlet Player.js 3.0.11 and Bunny-documented Player.js 0.1.0.
- Node/tsx security and API-contract tests; Playwright end-to-end browser/API tests.

Node **22.12+** is required; Node 24 is recommended. Prisma is deliberately pinned to major 7: the installed Better Auth adapter does not yet support Prisma 8's changed client API. Dependencies are locked; a compatible Effect 3.22.5 override fixes its audited regex advisory.

## Standard PostgreSQL setup

1. Copy `.env.example` to `.env` using your editor. Fill the connection URL, a cryptographically random Better Auth secret of at least 32 characters, and the exact app origin. Never put secrets in `NEXT_PUBLIC_*`, source code, screenshots, or chat.
2. Use an existing PostgreSQL database, or the included Compose service. Set `POSTGRES_PASSWORD` privately before starting Docker. The URL must use the same user/database/password as Compose; URL-encode special characters in the password.
3. Apply migrations and seed the sample curriculum:

```powershell
docker compose up -d
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

Docker is optional and requires an installed/running Docker engine. Native PostgreSQL or a managed PostgreSQL service works with `DATABASE_URL`. The included Compose service uses user/database `streamlab`, binds port 5432 to loopback, and persists its volume. Change an already-initialized database password through PostgreSQL, not just Compose environment variables.

Sign up in the app, then grant admin to that existing account:

```powershell
npm.cmd run admin:promote -- --email your-email@example.com
```

For production verification:

```powershell
npm.cmd run build
npm.cmd start
```

Stop a dev server before building: Next dev/build share the default output directory. The no-Docker launcher can serve a previously built production app with `npm.cmd run dev:local -- --production`.

### Windows/corporate certificate stores

If Prisma engine downloads fail with `unable to get local issuer certificate`, Node 24 can use the Windows trusted certificate store:

```powershell
$env:NODE_USE_SYSTEM_CA = "1"
npm.cmd run db:generate
```

Do **not** disable TLS verification. Use `npm.cmd`/`npx.cmd` if PowerShell blocks its script shims. This project needs no elevated installation or VS Code extension.

## Real provider configuration

Use dedicated **test** workspaces/libraries initially. Enabling provider protections can affect every video in the shared scope. Only server environment variables hold API keys and signing secrets. IDs, configured hostnames, and authorized short-lived playback URLs are not private API credentials; playback URLs are nevertheless bearer credentials and must not be logged or shared.

### Target: codewithharry.com

Local development stays at `http://localhost:3000`. The domain label in the UI grants no access automatically.

- When the prototype is deliberately deployed at the apex, set the server auth origin to `https://codewithharry.com`; for the `www` host use `https://www.codewithharry.com` instead. Choose one canonical origin and redirect the other, or implement an explicitly reviewed multi-origin identity setup.
- Approve the actual embedding hostname at Gumlet, Bunny, and the prototype's local provider policy. `codewithharry.com` and `www.codewithharry.com` are separate hostnames; approve both only if both really embed the app. No production origin/domain settings are written by this branding change.
- Before integrating into the live website, connect its real authentication and course-entitlement checks at the server authorization boundary. No official website API endpoint or identity algorithm is assumed here.
- Keep the prototype deployment private/test-only until actual playback, expiry, wrong-domain, and unsigned-media checks have passed with real credentials. This is not a claim that the live CodeWithHarry site has been configured.

### Gumlet

Official references:

- [Video protection and exact signed iframe example](https://docs.gumlet.com/video/manage-videos/video-protection-settings-section#signed-url)
- [Create asset](https://docs.gumlet.com/reference/tag/video-assets/post/video/assets/index.md)
- [Asset details](https://docs.gumlet.com/reference/tag/video-assets/get/video/assets/asset_id/index.md)
- [List assets](https://docs.gumlet.com/reference/tag/video-assets/get/video/assets/list/workspace_id/index.md)
- [Get workspace](https://docs.gumlet.com/reference/tag/video-workspaces/get/video/workspaces/workspace_id/index.md)
- [Update workspace](https://docs.gumlet.com/reference/tag/video-workspaces/post/video/workspaces/workspace_id/index.md)
- [Official Player.js](https://docs.gumlet.com/developers/video-player/playerjs)
- [Expiry/MP4 limitations](https://docs.gumlet.com/video/manage-videos/video-protection-settings-section/time-based-expiry-urls)

1. Create a Video workspace and a scoped API key. Set `GUMLET_API_KEY`, `GUMLET_WORKSPACE_ID`, and `GUMLET_SIGNING_SECRET` privately.
2. Enable **Signed URL** and **Whitelist Referrers** in workspace protection. Allow the exact embedding hostname, including `localhost` for local tests if supported by your account. Do not include scheme, path, or port in the app's hostname policy.
3. Disable the download button in the Gumlet dashboard. Its GET response documents `enable_download_button`, but the published workspace update **request** schema does not; this app intentionally does not invent that update field.
4. Use adaptive (`ABR`/HLS/DASH) assets, not MP4-only outputs; ensure `mp4_access=false`. Inspect existing assets/profiles: hiding a button is insufficient. Gumlet states that generated MP4 downloads can function without secret tokens.
5. Add the same intended hostnames and TTL in the prototype. Optionally apply its documented signed-URL/referrer update with the explicit checkbox. Check the live configuration, then link a real processed asset to a lesson.

**Exact signing behavior:** the default implementation Base64-decodes the secret, HMAC-SHA1 signs the **relative** embed path, existing serialized query, and `signed_expires=<absolute Unix seconds>`, and outputs a hexadecimal `signed_token`. The host is not signed. Query order/encoding is preserved; the app adds its watermark/unique instance parameter **before** signing. This is different from Gumlet direct HLS/DASH signing and DRM token parameters.

**Official key-representation discrepancy:** the guide describes a hexadecimal secret but its JavaScript example explicitly Base64-decodes it; a workspace API example also shows hex. There is no guessing. Default `GUMLET_SIGNING_SECRET_ENCODING=base64` follows the signing example. If Gumlet confirms that your displayed key is hex, select `hex` explicitly. `GUMLET_REMOTE_SECRET_ENCODING` independently defines the workspace API representation so comparison operates on decoded bytes. Invalid/ambiguous values fail closed. Confirm the representation and a fixed signing vector with Gumlet before production; the offline vectors are reproducible examples, not vendor-issued verification.

**Strict effective-asset policy:** playback requires the real asset response to report `video_protection.signed_url=true`, a known adaptive output format, and `mp4_access=false`. If your API omits effective asset protection, the app blocks with `ASSET_PROTECTION_UNVERIFIED` instead of assuming inheritance. Ask Gumlet for the authoritative effective state; do not bypass this gate. Gumlet “private/dashboardOnly” assets may not be usable with website embeds; choose the provider-documented embed-compatible privacy plus token restrictions.

### Bunny Stream

Official references:

- [Embed token authentication](https://bunny.net/docs/stream/token-authentication.md)
- [Server-side signed embeds](https://bunny.net/docs/stream/player/signed-embeds.md)
- [Current and legacy player](https://bunny.net/docs/stream/player.md)
- [Next.js / Player.js integration](https://bunny.net/docs/stream/player/nextjs.md)
- [Get video](https://bunny.net/docs/api-reference/stream/manage-videos/get-video.md)
- [List videos](https://bunny.net/docs/api-reference/stream/manage-videos/list-videos.md)
- [Fetch a video from URL](https://bunny.net/docs/api-reference/stream/manage-videos/fetch-video.md)
- [Update video library](https://bunny.net/docs/api-reference/core/stream-video-library/update-video-library.md)
- [Add allowed referrer](https://bunny.net/docs/api-reference/core/stream-video-library/add-allowed-referer.md)
- [Pull Zone token configuration](https://bunny.net/docs/api-reference/core/pull-zone/update-pull-zone.md)
- [Stream security layers](https://bunny.net/docs/stream/security.md)

1. Create a Stream library. Set `BUNNY_LIBRARY_ID` and its **Stream API key** as `BUNNY_STREAM_API_KEY`.
2. Set the library **token authentication key** as `BUNNY_TOKEN_AUTH_KEY`. This is **not** the Stream API key, despite dashboard labels. It signs the embed/CDN security layers, using different algorithms for each.
3. Supply a suitably scoped **Core API key** as `BUNNY_CORE_API_KEY`. Stream API keys cannot be assumed to read/change the library and its linked Pull Zone. The Core key is required here for authoritative protection checks.
4. Enable **Embed view token authentication**; also enable the linked Pull Zone's **CDN token authentication**. Block missing referrers and configure a restricted embedding allowlist. Disable direct play, MP4 fallback, early play, and original exposure. Existing MP4 fallback assets must also be removed/reprocessed or replaced.
5. Default `BUNNY_PLAYER_HOST=player.mediadelivery.net` uses the current player, requiring library `PlayerVersion=2`. Explicit legacy `iframe.mediadelivery.net` requires `PlayerVersion=1`; Bunny documents its planned removal in early 2027. Verify your actual library setting.
6. In the prototype, set local domains/TTL and enable the provider. The explicit remote-apply checkbox sends only documented fields and turns on `ZoneSecurityEnabled` for the linked Pull Zone. It does **not** rotate keys or use the ambiguous `EnableTokenAuthentication` field as a substitute for checking the Pull Zone.

**Exact embed signature:** `SHA256_HEX(tokenAuthenticationKey + videoId + decimalUnixExpirySeconds)`, concatenated in that order with no separators. URL query fields are **`token`** and **`expires`**, not `embedToken`; library ID is in the path, not the hash. This is an iframe signature, not Bunny's CDN signing scheme. The official iframe is responsible for requesting protected media correctly.

An enabled Pull Zone edge rule that disables token authentication blocks playback. The configured host must match the real player version. Library/Pull Zone responses can include API keys and security keys: the app returns only whitelisted booleans and hostnames, never raw responses.

**Allowed-domain changes:** Gumlet replaces its remote allowlist through its documented update; Bunny only adds requested domains. Existing Bunny domains are never silently deleted. Playback rejects a remote allowlist broader than the locally approved policy—remove extras in Bunny's console or explicitly approve them locally. Domain/referrer restrictions are defense-in-depth, not user authentication.

Remote changes span multiple provider calls and are not atomic. If an intermediate request fails, earlier changes may already have taken effect; inspect the provider console and rerun the live configuration check before testing. Local policy is saved only after the requested remote calls complete.

### Add and link real videos

- **Link:** Admin → video library → choose lesson/provider → supply a real asset ID/GUID, or select it from the real paginated provider catalog. The server verifies its provider scope. The same lesson can map to one asset on each provider.
- **Import:** approve trusted public source hostnames in `VIDEO_IMPORT_ALLOWED_HOSTS`. Supply a direct HTTPS video file URL without query parameters, inline credentials, fragments, or custom ports. Both actual APIs import asynchronously; quota/billing may apply. The app does not fetch source media itself. DNS checks reject private/reserved addresses, but cannot pin the provider's DNS or control its redirects—approve only stable media hosts you control.
- Gumlet create uses `workspace_id`, `input`, `title`, `format=ABR`, and `mp4_access=false`; it returns an asset ID.
- Bunny `POST /library/{id}/videos/fetch` returns the documented **status model**, not a reliable GUID. Refresh its catalog and explicitly choose the resulting video. The app does not invent a fetch GUID or create a separate unattached video slot. Signed-origin URLs are intentionally not supported because Bunny's published guides conflict on them.
- Test with the **same source content**, similar encodings, and the same browser/network for useful comparisons.

## Security model

Every token request checks: same-origin mutation → current database session/user → role restrictions → course enrollment → rate limit → configured mapping/provider → real asset and provider protection → session/role/enrollment revalidation → locked enrollment check and persisted attempt → signed URL response.

- Better Auth handles password hashing, session tokens, HTTP-only cookies, and trusted-origin checks. No custom password/session algorithm is used. Roles are server-only additional fields; signup cannot assign admin.
- Admin tooling, catalog, imports, and provider changes require a fresh admin user row. Admins do not bypass enrollment for playback.
- Default provider TTL is 300 seconds; configured TTL is 60–3600 seconds. Only admins can override it or create expired/tampered probes. Session renewal checks authorization again; playback resume uses saved progress.
- Short tokens can interrupt long lessons. The app deliberately removes the normal player at a conservative deadline and provides manual renewal/resume. Countdown subtracts request transit time and is checked on focus/visibility. Browser timers are not a security boundary: provider rejection of expired media must be tested separately.
- Existing signed URLs are bearer credentials until provider expiry. Enrollment/session revocation prevents **new** issuance, not instant revocation of previously issued URLs. Do not cache/log/share signed URLs. This prototype does not implement DRM, IP-bound tokens, or per-viewer provider revocation.
- Client code imports only public DTO/types; server environment and provider factories use `server-only`. Pure signer/adaptor classes are isolated for tests and instantiated by the guarded server factory, never client modules.
- API responses use private `no-store` caching. Requests are strictly validated and bounded to 16 KB, with database-backed auth and application rate limits. No public wildcard CORS.
- Better Auth retains its stricter built-in authentication limits (including three sign-in/signup attempts per ten seconds), in addition to the configured general limit. Behind a production proxy, overwrite untrusted client forwarding headers and restrict direct origin access; otherwise client-IP headers can be spoofed. Isolated E2E tests assign different synthetic client IPs without disabling the real limiter.
- Player SDK receive methods are hardened with exact origin, specific iframe `contentWindow`, context, and event validation. Lifecycle cleanup removes listeners for both vendors.
- Lesson progress accepts a position and increasing sequence tied to a current owned lesson attempt and its verified asset/mapping revision. Session, enrollment, mapping, and expiry are rechecked inside the transaction. Late/duplicate updates cannot erase newer resume state; a later intentional backward seek is allowed. Comparison attempts cannot update progress. Client progress is not proof that a student watched attentively.
- Measurement ownership is checked. First timings are preserved and delayed initial/ready events cannot erase playback/terminal observations. These are client-reported diagnostics, not trusted security attestations. The prototype stores the latest 30 attempts per user for display; add retention/cleanup for production.
- CSP restricts iframe origins; framing of the app is denied. `strict-origin-when-cross-origin` preserves provider referrers. The prototype CSP permits inline scripts/styles for Next hydration; use per-request nonces and a reviewed stricter production policy. Enable HTTPS behind a correctly configured trusted proxy.
- Email verification, password-reset email delivery, MFA, robust account recovery, compliance/audit retention, distributed operational monitoring, and DRM are **not configured**. Email signup is suitable for a controlled prototype, not a claim of production-ready identity assurance.

No browser application can prevent an authorized viewer from screen-recording content. Signed URLs and domain restrictions are not DRM and are not a guarantee against downloading by authorized viewers.

## Comparison measurements

The test bench records separately:

| Measurement | Meaning |
| --- | --- |
| Server issuance time | Authentication, enrollment, remote API protection/readiness checks, signing; excludes final database commit and client network. |
| Token API round trip | Browser elapsed time for the entire authorized request. |
| Iframe load | Frame navigation completed; **not video success**. |
| Player ready | Official SDK can accept commands; **not video success**. |
| Advancing media time | Two advancing `timeupdate` events while playing; stronger observation, **not an exact decoded first-frame timestamp**. Includes user press-play delay. |
| Expiry | Application token deadline; not proof that CDN segments or already-buffered playback were rejected. |

Missing data says **Not measured**, not zero. The lab does not read cross-origin iframe HTTP status or invent startup/rejection results. Simultaneous runs share bandwidth; repeat sequentially under controlled conditions for meaningful performance comparisons. Autoplay/click timing and hidden tabs can affect results.

The “without a session” and “without enrollment” buttons call the real application API and require both the expected HTTP status **and** error code. A generic 403 is not accepted as proof of enrollment protection.

## Testing

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run test:live
```

Offline tests include fixed signing vectors, official API request contracts, secret redaction, scope/authorization/revocation checks, domain/download/unknown-state denial, import validation, player-message checks, and actual PostgreSQL/WASM migration/Prisma behavior. Contract fixtures exist **only in tests** and never provide runtime provider data.

Playwright runs the production build against an isolated in-memory PostgreSQL database and random ephemeral auth secret. It uses installed Microsoft Edge on Windows and Playwright Chromium on Linux/macOS by default; `PLAYWRIGHT_CHANNEL` can override the browser channel. Install Chromium with `npx playwright install chromium` where needed. Explicit empty provider-key overrides prevent Next from loading real credentials from your private environment files. Tests exercise signup, role protection, enrollment, missing-video failures, CSRF, validation, course navigation, mobile overflow, and headers. The GitHub workflow repeats offline/build/browser checks without provider secrets.

Live tests are **explicitly skipped** without private credentials and `LIVE_GUMLET_ASSET_ID`/`LIVE_BUNNY_VIDEO_ID`. They make read-only actual asset/library/Pull Zone calls and validate configuration, not browser playback. Optional `LIVE_EMBED_PROBES=true` checks iframe **HTTP shell reachability only**; HTTP 200 is not a successful stream. Tests never print provider credentials or signed URLs.

### Credentialed acceptance checklist

Use the actual allowed app domain, two ready protected assets from the same source, and browser network tools. No item below should be marked complete merely because unit tests or the build passed.

- [ ] Gumlet and Bunny normal authorized playback show advancing media time.
- [ ] Wrong-domain embedding is rejected at the provider, including subdomains and missing referrers.
- [ ] Already-expired and tampered signatures produce actual provider/HTTP/media denial, not just an iframe load/timeout. Use admin negative scenarios.
- [ ] Unsigned direct HLS manifest **and segment** requests fail; thumbnails/previews do not leak unprotected originals or MP4s.
- [ ] A new media request after expiry is denied. Record already-buffered behavior separately.
- [ ] Enrollment/session revocation prevents new token issuance, while documenting existing-token lifetime.
- [ ] Renew/resume works for a long lesson; switching providers cleans up the previous player.
- [ ] Repeat startup observations on mobile/desktop and realistic networks; account for click/autoplay timing.
- [ ] Verify actual provider billing/quota/errors and current/legacy player settings.

See `docs/testing.md` for detailed evidence and diagnostic guidance. Actual provider playback cannot be certified without real credentials, account protection configuration, and these browser tests.

## Main routes and modules

- `/login`, `/signup`, `/setup`: auth and missing-configuration UX.
- `/dashboard`, `/courses`, `/courses/{slug}/lessons/{id}`: protected learning workspace.
- `/admin`: admin-only provider configuration, imports, linking, and playback testing.
- `/comparison`: per-user test bench and stored observations.
- `POST /api/playback`: enrollment-gated signed iframe issuance.
- `POST /api/enrollments`, `POST /api/progress`: validated enrollment/progress.
- `POST /api/measurements/{id}`: owned client observations.
- `/api/admin/providers/*`, `/api/admin/videos/*`: authenticated admin tooling only.

Provider algorithms/HTTP contracts live under `src/lib/server/providers`; authorization is centralized under `src/lib/server`. Sample seed and migration live under `prisma`. Nothing requires a provider API endpoint guessed by the application.
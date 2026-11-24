# Secure VDO Streaming

A small **Next.js** app to test the same course video on **Gumlet and Bunny Stream**, with login, enrollment checks, and short-lived playback links.

[Start](#start) · [Test a video](#test-a-vdo-platform-video) · [Still needed](#still-needed) · [Full guide](docs/setup.md) · [Test results](docs/verification.md)

> **Prototype ready. Real vdo platform playback is not yet verified.** Live testing needs your provider keys and an authorized video. A course/YouTube link is not a provider video ID.

## Start

Install **Node 22.12+** (24 recommended). Run in this project folder:

```powershell
npm.cmd install
npm.cmd run db:generate
npm.cmd run dev:local
```

Open **[localhost:3000/signup](http://localhost:3000/signup)**. No Docker needed. On macOS/Linux, use `npm` instead of `npm.cmd`.

## Test a vdo platform video

1. Get a vdo platform video you have **permission to upload/use**. Viewing access alone does not permit rehosting.
2. **Sign up** (12-character minimum password), then enable admin access below.
3. **Add both providers' private keys** using the instructions below; restart the app.
4. Upload the **same authorized file** to both provider consoles (or use existing authorized assets); wait for processing.
5. In **Provider setup**, save/check protection and link both real video IDs to the **same lesson**.
6. In **Course access**, enroll—even admins must. Click **Run both providers**, play each video, and open **Saved test runs**.

<details>
<summary><strong>Enable admin access</strong></summary>

Keep the app running. In a second terminal, replace the email with your signup email:

```powershell
npm.cmd run admin:promote -- --local --email your-email@example.com
```

Refresh the browser. No default account or password is created.
</details>

<details>
<summary><strong>Add private keys and protect the videos</strong></summary>

Create **.env.local** in your editor from [the template](.env.example). For local mode, leave `DATABASE_URL`, `POSTGRES_PASSWORD`, and `BETTER_AUTH_SECRET` empty; keep `BETTER_AUTH_URL=http://localhost:3000`.

| Provider | Required values |
| --- | --- |
| Gumlet | `GUMLET_API_KEY`, `GUMLET_WORKSPACE_ID`, `GUMLET_SIGNING_SECRET` |
| Bunny | `BUNNY_STREAM_API_KEY`, `BUNNY_LIBRARY_ID`, `BUNNY_TOKEN_AUTH_KEY`, `BUNNY_CORE_API_KEY` |

Also set `LIVE_GUMLET_ASSET_ID` and `LIVE_BUNNY_VIDEO_ID` to those same real videos for automated live checks.

Enable signed/embed **and media/CDN protection**, allow your app's hostname, and disable downloads/MP4/original bypasses. Follow [exact provider settings](docs/setup.md). **Never commit keys or paste them into chat.**
</details>

<details>
<summary><strong>Run checks and understand results</strong></summary>

Stop the dev/preview server before these build checks:

```powershell
npm.cmd run check
npm.cmd run test:e2e
npm.cmd run test:live
```

Live checks **skip** without keys/videos; they are not playback proof. Use the app to test denied access and admin-only short/expired/tampered tokens. Loading, HTTP 200, or a countdown is not a security pass: verify real playback and provider rejection using [this checklist](docs/testing.md).
</details>

## Still needed

- [ ] Your provider accounts/keys and the same **authorized vdo platform video** on both providers; usage may cost money.
- [ ] Real-browser playback, expired/tampered-token, wrong-domain, and unsigned manifest/segment checks.
- [ ] For production: authorized website login/entitlement integration, HTTPS, native PostgreSQL, and operational safeguards—see [the guide](docs/setup.md).

**No existing vdo platform account/media integration, fake streams, or DRM.** Existing data is preserved. GitHub upload is not deployment or live verification. [CI](https://github.com/AmnaKhan1323/secure-vdo-streaming/actions)
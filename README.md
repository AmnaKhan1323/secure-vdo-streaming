# Secure VDO Streaming

A small **Next.js + TypeScript** prototype to compare secure course videos on **Gumlet and Bunny Stream**. Real APIs, server-signed playback, enrollment checks, and honest browser measurements—not a new LMS.

[Start locally](#quick-start) · [Use the app](#use-the-app) · [Your remaining steps](#your-remaining-steps) · [Full setup](docs/setup.md) · [Test evidence](docs/verification.md) · [CI](https://github.com/AmnaKhan1323/secure-vdo-streaming/actions)

> **Prototype code is implemented. Live playback needs your provider credentials and authorized videos.** No fake streams, default accounts, or production certification.

## Quick start

Install **Node 22.12+** (24 recommended), then run in this project folder:

```powershell
npm.cmd install
npm.cmd run db:generate
npm.cmd run dev:local
```

Open **[localhost:3000/signup](http://localhost:3000/signup)**. No Docker needed. On macOS/Linux, use `npm` instead of `npm.cmd`. Keep `DATABASE_URL` empty for this local mode; private database/session data stay in the ignored **.local** folder.

## Use the app

1. **Sign up** with a password of at least 12 characters.
2. **Enable admin access** for that existing account—expand the instructions below.
3. **Configure both providers** privately and enable token/domain protection.
4. **Upload the same authorized video in each provider's console**, then link both real IDs to one lesson in **Provider setup**.
5. **Enroll using Course access** on the comparison screen—even admins must enroll.
6. Open **Video comparison → Run both providers**. Play each iframe; expand **Saved test runs** for stored results.

<details>
<summary><strong>🔑 Enable admin access</strong></summary>

Keep the app running. In a second terminal, use your signup email:

```powershell
npm.cmd run admin:promote -- --local --email your-email@example.com
```

Refresh the browser to see **Provider setup**. This command creates no new account/password.

</details>

<details>
<summary><strong>⚙️ Connect Gumlet and Bunny</strong></summary>

Create **.env.local** in your editor using [the template](.env.example). For `dev:local`, leave database/password/auth-secret values empty; keep `BETTER_AUTH_URL=http://localhost:3000`.

| Provider | Private server variables |
| --- | --- |
| Gumlet | `GUMLET_API_KEY`, `GUMLET_WORKSPACE_ID`, `GUMLET_SIGNING_SECRET` |
| Bunny | `BUNNY_STREAM_API_KEY`, `BUNNY_LIBRARY_ID`, `BUNNY_TOKEN_AUTH_KEY`, `BUNNY_CORE_API_KEY` |

Restart after changing values. Enable **signed/embed + media/CDN tokens**, allow the actual hostname, and disable MP4/original/download bypasses. In **Provider setup**, save/check policy and link both videos. Failed updates stay disabled until recovery.

**Never upload secrets or paste them into the UI/chat.** See [exact provider steps, key encodings, and recovery](docs/setup.md).

</details>

<details>
<summary><strong>🧪 Test and read the results</strong></summary>

- Test **without a session/enrollment**; both application paths must deny access.
- Admins can test **60-second, expired, and tampered tokens**.
- Iframe load and SDK ready are **not** playback success. Advancing media time is a browser observation, not an exact first-frame benchmark.
- App expiry is **not** proof of provider/CDN rejection. Tests record observations only and never change stored learner progress.

Stop a dev server before building, then run:

```powershell
npm.cmd run check
npm.cmd run test:e2e
npm.cmd run test:live
```

Live tests skip without credentials/assets. See [browser acceptance checks](docs/testing.md) and [verification results](docs/verification.md).

</details>

## Your remaining steps

- [ ] Supply **your own Gumlet/Bunny accounts, private keys, and authorized video**; encoding/bandwidth may cost money.
- [ ] Verify real playback, expired/tampered tokens, wrong domains, and unsigned **manifests + segments** in actual browsers.
- [ ] Before production, connect real website entitlements and configure **HTTPS, native PostgreSQL, recovery/MFA, backups, and monitoring**.

Originally intended to evaluate codewithharry.com videos; **no official account/catalog/media integration is included**. Signed URLs are not DRM, existing URLs last until provider expiry, and authorized screen recording cannot be prevented completely. **GitHub upload is not deployment.**

**Kept small:** one comparison screen + essential provider setup. Course marketing/search/curriculum pages, progress tracking, URL imports, and catalog browsing have been removed. Existing data is preserved; old course links return to the test bench. A fresh database contains two text-only playback/access test containers, not full courses or videos.

**Stack:** Next.js App Router · Tailwind · Better Auth · PostgreSQL/Prisma 7.

**References:** [Gumlet protection](https://docs.gumlet.com/video/manage-videos/video-protection-settings-section#signed-url) · [Bunny tokens](https://bunny.net/docs/stream/token-authentication.md) · [Detailed setup](docs/setup.md)
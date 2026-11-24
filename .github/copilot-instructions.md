# Secure VDO Streaming workspace instructions

## Completed implementation

- [x] Inspect repository and create workspace instructions.
- [x] Clarify requirements: Next.js, actual Gumlet/Bunny integrations, PostgreSQL, protected EdTech UX.
- [x] Scaffold in the original root and generate the Prisma client.
- [x] Implement authentication, enrollment, curriculum, progress, providers, admin tools, player, and comparison lab.
- [x] Extensions: none required or installed.
- [x] Validate: production build, strict TypeScript, zero-warning lint, 56 offline tests, 13 production browser/API tests, and clean dependency audit.
- [x] Create and run the VS Code production build task.
- [x] Launch the built local preview without a debugger after explicit user confirmation; signup opened at http://localhost:3000/signup.
- [x] Complete README, environment template, testing guide, and verification record; remove scaffolding comments from this file.
- [x] Run credential-gated tests: four explicitly skipped without actual credentials/assets; do not claim live provider playback passed.
- [x] Scope corrected for codewithharry.com: comparison-first small streaming prototype, no additional curricula on preview restart. Revalidated 61 offline + 15 production browser/API tests, types/lint/build, and clean audit; existing signed-in session/data preserved.
- [x] Renamed product to Secure VDO Streaming, wrote easy usage/gaps documentation, and completed pending hardening: 77 offline + 16 E2E tests, strict types/lint/build, clean audit; four live checks remain skipped without credentials.
- [x] Published reviewed source to public AmnaKhan1323/secure-vdo-streaming, preserving the starter commit; private files excluded. GitHub Actions verification passed for implementation commit 15ddf16.
- [x] Trimmed to the minimal comparator: removed LMS pages/progress, URL imports/catalog, and duplicate admin player. Retained both providers and secure access; validated 81 offline + 18 production browser/API tests, build/types/lint/audit. Live provider checks remain credential-gated.
- [x] Published the minimal implementation as 503370c; GitHub Actions Verify prototype run 45403044863 passed on Ubuntu/Node 24. Same-data preview/session preserved; all 72 staged paths reviewed and private artifacts excluded.
- [x] Rechecked CodeWithHarry live prerequisites: keys/live IDs/mappings missing; four live checks skipped, 81 offline + 18 browser/API tests/types/lint passed again. User chose a shorter interactive README now and live testing later; no third-party video was copied or successful live playback claimed.

## Development rules

- The app's name is Secure VDO Streaming (renamed at the user's request). Its original evaluation target is codewithharry.com, not automatic website/identity integration. Keep public product branding neutral, preserve legacy IDs, and never claim official media, catalogue, instructor, or website integration without authorization/configuration.
- Scope is a small Gumlet/Bunny secure-course-video comparison prototype, not a new LMS. Put the dual-provider test bench first; do not expand curricula or add unrelated platform features.
- Current scope excludes course marketing/search/curriculum screens, learner-progress writes, URL imports/catalog browsing, and a duplicate admin test bench. Enrollment belongs on the comparison screen; provider setup only verifies policy and links real IDs. Preserve historical tables/records and legacy URL redirects.
- Preserve existing users, session secrets, enrollments, progress, video mappings, and course/lesson identities. New Python/DSA curricula must use new IDs, not overwrite unrelated existing courses.
- Work in the existing project root; do not create another project folder or generate media without a request. Keep communication concise.
- Preserve the calm dark blue/violet EdTech design, clear navigation, accessible states, and low motion.
- Use Next.js App Router + TypeScript + Tailwind. Database is PostgreSQL + Prisma 7 with PrismaPg; Better Auth handles passwords and database sessions. Do not upgrade to Prisma 8 without confirmed auth-adapter support.
- Keep API keys/signing secrets in server environment variables. Never read, print, diff, or log secret values, including example configs and signed bearer URLs.
- Runtime providers are actual APIs only. Fixtures are test-only; no fallback streams, fake video IDs, shared passwords, or automatic admin signup.
- Every playback issuance checks a fresh user/session, enrollment (including admins), asset scope/readiness, explicit effective protection, approved domains, and download/media-token controls. Revalidate after upstream calls and retain enrollment locks at commit.
- Follow the official provider links in README. Gumlet iframe HMAC-SHA1 signs relative path/query plus Unix-second signed_expires; Bunny embed SHA-256 signs key + videoId + Unix-second expiry. Never substitute direct CDN/DRM algorithms.
- Gumlet key encodings are explicit, never guessed. Unknown effective asset signing/format, MP4 exposure, broader remote domains, or Bunny token-bypass rules fail closed. Do not invent provider update fields or Bunny fetch GUIDs.
- Only whitelisted provider DTOs reach clients. Strict bounded JSON, same-origin mutations, no-store responses, and owned measurements must be preserved. No runtime route may write historical learner progress.
- SDK lifecycle uses exact iframe source/origin guards. Iframe load, ready, advancing-time playback, and application expiry are different observations. No fabricated performance/rejection claims.

## Commands and verification

- npm.cmd run typecheck; npm.cmd run lint; npm.cmd test; npm.cmd run build; npm.cmd run test:e2e; npm.cmd run test:live.
- Prefer the existing VS Code build task. Stop any dev server before building; it shares .next. The production preview can remain running while no build changes occur.
- Local convenience: npm.cmd run dev:local (or -- --production after building). It runs git-ignored PostgreSQL/WASM data and a random private session secret on loopback only; native PostgreSQL is required for production verification.
- Existing-account admin grant: npm.cmd run admin:promote -- --local --email <existing-email>, or omit --local for configured PostgreSQL. Never create a default password/account.
- Local socket server permits two clients (app plus admin); native Postgres semantics are not assumed. Isolated tests cover concurrent transactions and rollback.
- Node 24 corporate TLS downloads can use NODE_USE_SYSTEM_CA=1; never disable TLS validation.
- Read docs/verification.md and docs/testing.md before claiming live security. Real playback/expiry/domain/CDN enforcement still needs credentials and provider-account/browser acceptance checks.
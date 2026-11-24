import { expect, test, type APIRequestContext } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

const origin = "http://localhost:3001";
const courseId = "cwh-web-development";
const lessonId = "cwh-web-development-lesson-1";

test.beforeEach(async ({ page }) => {
  // Distinct isolated clients keep Better Auth's real 3-signups/10s rule active.
  const [a, b, c] = randomBytes(3);
  const headers = { "X-Forwarded-For": `10.${a}.${b}.${c}` };
  await page.context().setExtraHTTPHeaders(headers);
});

async function signUp(request: APIRequestContext, extra: Record<string, unknown> = {}) {
  const [a, b, c] = randomBytes(3);
  const clientIp = `10.${a}.${b}.${c}`;
  const response = await request.post("/api/auth/sign-up/email", { headers: { Origin: origin, "X-Forwarded-For": clientIp }, data: { name: "Test Learner", email: `${randomUUID()}@example.test`, password: randomBytes(24).toString("base64"), ...extra } });
  expect(response.status()).toBe(200);
  return response.json();
}

test("Anonymous routes redirect and playback denies access without a URL", async ({ request }) => {
  const page = await request.get("/dashboard", { maxRedirects: 0 });
  expect(page.status()).toBe(307);
  expect(page.headers().location).toBe("/login");
  const response = await request.post("/api/playback", { headers: { Origin: origin }, data: { lessonId, provider: "GUMLET" } });
  expect(response.status()).toBe(401);
  const result = await response.json();
  expect(result.error.code).toBe("UNAUTHENTICATED");
  expect(result.embedUrl).toBeUndefined();
});

test("Signup cannot grant a client-supplied administrator role", async ({ request }) => {
  const result = await signUp(request, { role: "ADMIN" });
  expect(result.user.role).toBe("STUDENT");
  const admin = await request.get("/admin", { maxRedirects: 0 });
  // Next can send a streamed meta redirect after the parent layout flushed.
  if (admin.status() === 307) expect(admin.headers().location).toBe("/dashboard");
  else {
    expect(admin.status()).toBe(200);
    const html = await admin.text();
    expect(html).toContain('url=/dashboard');
    expect(html).not.toContain('Your video library');
  }
  const catalog = await request.get("/api/admin/videos/catalog?provider=GUMLET");
  expect(catalog.status()).toBe(403);
  expect((await catalog.json()).error.code).toBe("FORBIDDEN");
});

test("Enrollment gate and missing-video state remain distinct and fail closed", async ({ request }) => {
  await signUp(request);
  const denied = await request.post("/api/playback", { headers: { Origin: origin }, data: { lessonId, provider: "BUNNY" } });
  expect(denied.status()).toBe(403);
  expect((await denied.json()).error.code).toBe("NOT_ENROLLED");
  const enrolled = await request.post("/api/enrollments", { headers: { Origin: origin }, data: { courseId } });
  expect(enrolled.status()).toBe(200);
  for (const provider of ["GUMLET", "BUNNY"]) {
    const playback = await request.post("/api/playback", { headers: { Origin: origin }, data: { lessonId, provider } });
    expect(playback.status()).toBe(409);
    const result = await playback.json();
    expect(result.error.code).toBe("VIDEO_NOT_CONFIGURED");
    expect(result.embedUrl).toBeUndefined();
  }
});

test("CSRF, role spoofing, admin-only probes, and oversized bodies are rejected", async ({ request }) => {
  await signUp(request);
  const crossOrigin = await request.post("/api/enrollments", { headers: { Origin: "https://evil.example" }, data: { courseId } });
  expect(crossOrigin.status()).toBe(403);
  expect((await crossOrigin.json()).error.code).toBe("INVALID_ORIGIN");
  const spoof = await request.post("/api/playback", { headers: { Origin: origin }, data: { lessonId, provider: "GUMLET", userId: "victim" } });
  expect(spoof.status()).toBe(400);
  for (const mode of ["expired", "tampered"]) {
    const probe = await request.post("/api/playback", { headers: { Origin: origin }, data: { lessonId, provider: "GUMLET", mode } });
    expect(probe.status()).toBe(403);
    expect((await probe.json()).error.code).toBe("FORBIDDEN");
  }
  const large = await request.post("/api/enrollments", { headers: { Origin: origin, "Content-Type": "application/json" }, data: JSON.stringify({ courseId, extra: "x".repeat(20_000) }) });
  expect(large.status()).toBe(413);
});

test("Invalid progress/measurement cannot impersonate another account", async ({ request }) => {
  await signUp(request);
  await request.post("/api/enrollments", { headers: { Origin: origin }, data: { courseId } });
  const progress = await request.post("/api/progress", { headers: { Origin: origin }, data: { lessonId, attemptId: randomUUID(), sequence: 1, positionSeconds: 10 } });
  expect(progress.status()).toBe(403);
  expect((await progress.json()).error.code).toBe("PLAYBACK_SESSION_EXPIRED");
  const measurement = await request.post(`/api/measurements/${randomUUID()}`, { headers: { Origin: origin }, data: { outcome: "ready", readyMs: 5 } });
  expect(measurement.status()).toBe(404);
  const forcedCompletion = await request.post("/api/progress", { headers: { Origin: origin }, data: { lessonId, attemptId: randomUUID(), sequence: 1, positionSeconds: 0, completed: true } });
  expect(forcedCompletion.status()).toBe(400);
});

test("UI signup, catalog filtering, enrollment, provider switcher, and comparison work", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("Jamie Learner");
  await page.getByLabel("Email address").fill(`${randomUUID()}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill(randomBytes(24).toString("base64"));
  await page.getByRole("button", { name: "Create your account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Secure course-video streaming", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run both providers" })).toBeDisabled();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Test courses", exact: true }).click();
  await page.getByLabel("Filter course catalog").fill("web development");
  await expect(page.getByRole("heading", { name: "Web development foundations" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Python programming essentials" })).toHaveCount(0);
  await page.getByRole("heading", { name: "Web development foundations" }).click();
  await page.getByRole("button", { name: "Enroll in this course" }).click();
  await expect(page.getByRole("link", { name: "Continue learning", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Continue learning", exact: true }).click();
  await expect(page.getByText("A real video is needed first.")).toBeVisible();
  await page.getByRole("button", { name: "Bunny Stream", exact: true }).click();
  await expect(page.getByText(/No Bunny Stream video has been linked/)).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.getByRole("link", { name: "Video comparison", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Secure course-video streaming", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Test without a session" }).click();
  await expect(page.getByText(/Authentication gate verified:.*UNAUTHENTICATED/)).toBeVisible();
  await expect(page.getByText(/Authentication gate verified: Gumlet: HTTP 401; Bunny Stream: HTTP 401/)).toBeVisible();
  await page.getByRole("button", { name: "Test without enrollment" }).click();
  await expect(page.getByText(/Enrollment gate verified:.*NOT_ENROLLED/)).toBeVisible();
  await expect(page.getByText(/Enrollment gate verified: Gumlet: HTTP 403; Bunny Stream: HTTP 403/)).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("Mobile navigation is usable and layouts have no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("Mobile Learner");
  await page.getByLabel("Email address").fill(`${randomUUID()}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill(randomBytes(24).toString("base64"));
  await page.getByRole("button", { name: "Create your account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Test courses", exact: true }).click();
  await expect(page).toHaveURL(/\/courses$/);
  await expect(page.getByLabel("Filter course catalog")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("Security headers and private no-store API responses are present", async ({ request }) => {
  const response = await request.get("/login");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  const api = await request.post("/api/playback", { headers: { Origin: origin }, data: { lessonId, provider: "GUMLET" } });
  expect(api.headers()["cache-control"]).toContain("no-store");
});

test("Out-of-band admin grants unlock tools without bypassing enrollment or missing keys", async ({ page }) => {
  const result = await signUp(page.context().request);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: "postgresql://postgres@127.0.0.1:15438/postgres?sslmode=disable", max: 1 }) });
  try { await prisma.user.update({ where: { id: result.user.id }, data: { role: "ADMIN" } }); }
  finally { await prisma.$disconnect(); }
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "A secure foundation for every lesson." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your video library" })).toBeVisible();
  await expect(page.getByText("GUMLET_API_KEY, GUMLET_WORKSPACE_ID, GUMLET_SIGNING_SECRET", { exact: true })).toBeVisible();
  const playback = await page.context().request.post("/api/playback", { headers: { Origin: origin }, data: { lessonId, provider: "GUMLET" } });
  expect(playback.status()).toBe(403);
  expect((await playback.json()).error.code).toBe("NOT_ENROLLED");
  const setting = await page.context().request.put("/api/admin/providers/GUMLET", { headers: { Origin: origin }, data: { enabled: true, ttlSeconds: 300, allowedDomains: ["localhost"], applyRemote: false } });
  expect(setting.status()).toBe(200);
  const verify = await page.context().request.post("/api/admin/providers/GUMLET/verify", { headers: { Origin: origin }, data: {} });
  expect(verify.status()).toBe(503);
  expect((await verify.json()).error.code).toBe("CONFIGURATION_REQUIRED");
  const imported = await page.context().request.post("/api/admin/videos/import", { headers: { Origin: origin }, data: { provider: "GUMLET", title: "Test", sourceUrl: "https://unapproved.example.test/video.mp4" } });
  expect(imported.status()).toBe(403);
  expect((await imported.json()).error.code).toBe("SOURCE_HOST_NOT_ALLOWED");
});

test("Student browser navigation to admin redirects without rendering privileged data", async ({ page }) => {
  await signUp(page.context().request);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Your video library" })).toHaveCount(0);
});

test("Actual Better Auth sign-in rate limit denies the fourth rapid attempt", async ({ request }) => {
  const [a, b, c] = randomBytes(3);
  const headers = { Origin: origin, "X-Forwarded-For": `10.${a}.${b}.${c}` };
  const data = { email: `${randomUUID()}@example.test`, password: randomBytes(24).toString("base64") };
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await request.post("/api/auth/sign-in/email", { headers, data });
    expect(response.status()).toBe(401);
  }
  const limited = await request.post("/api/auth/sign-in/email", { headers, data });
  expect(limited.status()).toBe(429);
});

test("Real signup, signout, and password login establish and revoke database sessions", async ({ request }) => {
  const email = `${randomUUID()}@example.test`;
  const password = randomBytes(24).toString("base64");
  await signUp(request, { email, password });
  const signedOut = await request.post("/api/auth/sign-out", { headers: { Origin: origin }, data: {} });
  expect(signedOut.status()).toBe(200);
  const denied = await request.post("/api/playback", { headers: { Origin: origin }, data: { lessonId, provider: "GUMLET" } });
  expect(denied.status()).toBe(401);
  const [a, b, c] = randomBytes(3);
  const signedIn = await request.post("/api/auth/sign-in/email", { headers: { Origin: origin, "X-Forwarded-For": `10.${a}.${b}.${c}` }, data: { email, password } });
  expect(signedIn.status()).toBe(200);
  expect(signedIn.headers()["set-cookie"]).toContain("HttpOnly");
  const enrollmentDenied = await request.post("/api/playback", { headers: { Origin: origin }, data: { lessonId, provider: "GUMLET" } });
  expect(enrollmentDenied.status()).toBe(403);
  expect((await enrollmentDenied.json()).error.code).toBe("NOT_ENROLLED");
});

test("Owned progress and measurement routes persist monotonically against actual PostgreSQL", async ({ request }) => {
  const account = await signUp(request);
  await request.post("/api/enrollments", { headers: { Origin: origin }, data: { courseId } });
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: "postgresql://postgres@127.0.0.1:15438/postgres?sslmode=disable", max: 1 }) });
  const attemptId = randomUUID();
  try {
    // Explicit test-only database fixtures. No runtime provider API or playback
    // is substituted; this exercises owned persistence routes, not live media.
    const videoMapping = await prisma.lessonVideo.upsert({ where: { lessonId_provider: { lessonId, provider: "GUMLET" } }, create: { lessonId, provider: "GUMLET", assetId: "6192269e0822a81d955d1a4b" }, update: {} });
    await prisma.playbackAttempt.create({ data: { id: attemptId, userId: account.user.id, lessonId, provider: "GUMLET", assetId: videoMapping.assetId, assetMappedAt: videoMapping.updatedAt, purpose: "lesson", issuanceMs: 1, durationSeconds: 180, expiresAt: new Date(Date.now() + 300_000) } });
    let sequence = 0;
    const update = (positionSeconds: number) => request.post("/api/progress", { headers: { Origin: origin }, data: { lessonId, attemptId, sequence: ++sequence, positionSeconds } });
    expect((await update(175)).status()).toBe(200);
    const concurrent = await Promise.all([update(25), update(40)]);
    expect(concurrent.every((response) => response.status() === 200)).toBe(true);
    const progress = await prisma.lessonProgress.findUniqueOrThrow({ where: { userId_lessonId: { userId: account.user.id, lessonId } } });
    expect(progress.completed).toBe(true);
    expect(progress.percent).toBeGreaterThanOrEqual(95);
    expect(progress.positionSeconds).toBe(40);
    const delayed = await request.post("/api/progress", { headers: { Origin: origin }, data: { lessonId, attemptId, sequence: 2, positionSeconds: 179 } });
    expect(delayed.status()).toBe(200);
    expect((await delayed.json()).saved).toBe(false);
    expect((await prisma.lessonProgress.findUniqueOrThrow({ where: { userId_lessonId: { userId: account.user.id, lessonId } } })).positionSeconds).toBe(40);
    const metric = (data: Record<string, unknown>) => request.post(`/api/measurements/${attemptId}`, { headers: { Origin: origin }, data });
    expect((await metric({ outcome: "playing", firstFrameMs: 250, readyMs: 100, tokenRequestMs: 50 })).status()).toBe(200);
    expect((await metric({ outcome: "ready", readyMs: 999 })).status()).toBe(200);
    const observed = await prisma.playbackAttempt.findUniqueOrThrow({ where: { id: attemptId } });
    expect(observed.outcome).toBe("playing");
    expect(observed.readyMs).toBe(100);
    expect(observed.firstFrameMs).toBe(250);
    await prisma.enrollment.delete({ where: { userId_courseId: { userId: account.user.id, courseId } } });
    const revoked = await update(60);
    expect(revoked.status()).toBe(403);
    expect((await revoked.json()).error.code).toBe("NOT_ENROLLED");
  } finally {
    await prisma.playbackAttempt.deleteMany({ where: { id: attemptId } });
    await prisma.lessonVideo.deleteMany({ where: { lessonId, provider: "GUMLET" } });
    await prisma.$disconnect();
  }
});

test("Secure VDO Streaming home is a small dual-provider test bench, with an unchanged comparison URL", async ({ page }) => {
  await signUp(page.context().request);
  await page.goto("/dashboard");
  await expect(page).toHaveTitle("Secure streaming test · Secure VDO Streaming");
  await expect(page.getByRole("link", { name: "Secure VDO Streaming home" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Secure course-video streaming", exact: true })).toBeVisible();
  await expect(page.getByText("PROTOTYPE · NOT THE LIVE WEBSITE", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Gumlet setup status")).toBeVisible();
  await expect(page.getByLabel("Bunny Stream setup status")).toBeVisible();
  await expect(page.getByText("Awaiting an enrolled test lesson", { exact: true })).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Run both providers" })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Build your coding foundations" })).toHaveCount(0);
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.goto("/comparison");
  await expect(page).toHaveTitle("Secure streaming comparison · Secure VDO Streaming");
  await expect(page.getByRole("heading", { name: "Secure course-video streaming", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Video comparison", exact: true })).toHaveAttribute("aria-current", "page");
});

test("Paired lesson mappings are preferred but missing credentials never unlock a run", async ({ page }) => {
  await signUp(page.context().request);
  await page.context().request.post("/api/enrollments", { headers: { Origin: origin }, data: { courseId } });
  const pairedLessonId = "cwh-web-development-lesson-2";
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: "postgresql://postgres@127.0.0.1:15438/postgres?sslmode=disable", max: 1 }) });
  try {
    // Test-only persistence fixtures; no provider request or stream is mocked.
    await prisma.lessonVideo.createMany({ data: [
      { lessonId: pairedLessonId, provider: "GUMLET", assetId: "6192269e0822a81d955d1a4b" },
      { lessonId: pairedLessonId, provider: "BUNNY", assetId: randomUUID() },
    ] });
    await page.goto("/dashboard");
    await expect(page.getByLabel("Enrolled lesson")).toHaveValue(pairedLessonId);
    await expect(page.getByRole("button", { name: "Run both providers" })).toBeDisabled();
    await expect(page.getByText(/Both providers need private server credentials/)).toBeVisible();
    await expect(page.locator("iframe")).toHaveCount(0);
  } finally {
    await prisma.lessonVideo.deleteMany({ where: { lessonId: pairedLessonId } });
    await prisma.$disconnect();
  }
});

test("Comparison/legacy/changed-mapping attempts cannot alter lesson progress", async ({ request }) => {
  const account = await signUp(request);
  await request.post("/api/enrollments", { headers: { Origin: origin }, data: { courseId } });
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: "postgresql://postgres@127.0.0.1:15438/postgres?sslmode=disable", max: 1 }) });
  const attemptIds: string[] = [];
  try {
    const mapping = await prisma.lessonVideo.create({ data: { lessonId, provider: "GUMLET", assetId: "6192269e0822a81d955d1a4b" } });
    const savedProgress = await prisma.lessonProgress.create({ data: { userId: account.user.id, lessonId, positionSeconds: 45, durationSeconds: 180, percent: 25 } });
    const common = { userId: account.user.id, lessonId, provider: "GUMLET" as const, issuanceMs: 1, durationSeconds: 180, expiresAt: new Date(Date.now() + 300_000) };
    const comparison = await prisma.playbackAttempt.create({ data: { ...common, assetId: mapping.assetId, assetMappedAt: mapping.updatedAt, purpose: "comparison" } });
    const legacy = await prisma.playbackAttempt.create({ data: common });
    const original = await prisma.playbackAttempt.create({ data: { ...common, assetId: mapping.assetId, assetMappedAt: mapping.updatedAt, purpose: "lesson" } });
    attemptIds.push(comparison.id, legacy.id, original.id);
    const update = (attemptId: string) => request.post("/api/progress", { headers: { Origin: origin }, data: { lessonId, attemptId, sequence: 1, positionSeconds: 170 } });
    const comparisonDenied = await update(comparison.id);
    expect(comparisonDenied.status()).toBe(403);
    expect((await comparisonDenied.json()).error.code).toBe("COMPARISON_PROGRESS_DISABLED");
    const legacyDenied = await update(legacy.id);
    expect(legacyDenied.status()).toBe(403);
    expect((await legacyDenied.json()).error.code).toBe("PLAYBACK_SESSION_EXPIRED");
    // A -> B -> A must not restore the authority of the original A attempt.
    await prisma.lessonVideo.update({ where: { id: mapping.id }, data: { assetId: "aaaaaaaaaaaaaaaaaaaaaaaa", updatedAt: new Date(mapping.updatedAt.getTime() + 1) } });
    await prisma.lessonVideo.update({ where: { id: mapping.id }, data: { assetId: mapping.assetId, updatedAt: new Date(mapping.updatedAt.getTime() + 2) } });
    const revisionDenied = await update(original.id);
    expect(revisionDenied.status()).toBe(409);
    expect((await revisionDenied.json()).error.code).toBe("PLAYBACK_CONFIGURATION_CHANGED");
    expect(await prisma.lessonProgress.findUnique({ where: { id: savedProgress.id } })).toEqual(savedProgress);
  } finally {
    await prisma.playbackAttempt.deleteMany({ where: { id: { in: attemptIds } } });
    await prisma.lessonVideo.deleteMany({ where: { lessonId, provider: "GUMLET" } });
    await prisma.$disconnect();
  }
});
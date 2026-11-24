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
    expect(html).not.toContain('Link test videos');
  }
  const mapping = await request.post("/api/admin/videos", { headers: { Origin: origin }, data: { lessonId, provider: "GUMLET", assetId: "6192269e0822a81d955d1a4b" } });
  expect(mapping.status()).toBe(403);
  expect((await mapping.json()).error.code).toBe("FORBIDDEN");
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

test("Measurement requests cannot impersonate another account", async ({ request }) => {
  await signUp(request);
  await request.post("/api/enrollments", { headers: { Origin: origin }, data: { courseId } });
  const measurement = await request.post(`/api/measurements/${randomUUID()}`, { headers: { Origin: origin }, data: { outcome: "ready", readyMs: 5 } });
  expect(measurement.status()).toBe(404);
  const spoofed = await request.post(`/api/measurements/${randomUUID()}`, { headers: { Origin: origin }, data: { outcome: "ready", readyMs: 5, userId: "victim" } });
  expect(spoofed.status()).toBe(400);
});

test("Signup, inline course enrollment, both provider slots, and access probes work", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("Jamie Learner");
  await page.getByLabel("Email address").fill(`${randomUUID()}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill(randomBytes(24).toString("base64"));
  await page.getByRole("button", { name: "Create your account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Secure course-video streaming", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run both providers" })).toBeDisabled();
  await page.getByLabel("Test course", { exact: true }).selectOption(courseId);
  await page.getByRole("button", { name: "Enroll for testing", exact: true }).click();
  await expect(page.getByText("Enrolled for testing", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Enrolled lesson")).toHaveValue(lessonId);
  await expect(page.getByText("A real video is needed first.", { exact: true })).toHaveCount(2);
  await expect(page.getByText(/No Bunny Stream video has been linked/)).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
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
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Video comparison", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByLabel("Test course", { exact: true })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Provider setup", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Link test videos", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Playback test bench" })).toHaveCount(0);
  await expect(page.getByText("GUMLET_API_KEY, GUMLET_WORKSPACE_ID, GUMLET_SIGNING_SECRET", { exact: true })).toBeVisible();
  const playback = await page.context().request.post("/api/playback", { headers: { Origin: origin }, data: { lessonId, provider: "GUMLET" } });
  expect(playback.status()).toBe(403);
  expect((await playback.json()).error.code).toBe("NOT_ENROLLED");
  const setting = await page.context().request.put("/api/admin/providers/GUMLET", { headers: { Origin: origin }, data: { enabled: true, ttlSeconds: 300, allowedDomains: ["localhost"], applyRemote: false } });
  expect(setting.status()).toBe(200);
  const verify = await page.context().request.post("/api/admin/providers/GUMLET/verify", { headers: { Origin: origin }, data: {} });
  expect(verify.status()).toBe(503);
  expect((await verify.json()).error.code).toBe("CONFIGURATION_REQUIRED");
  const linking = await page.context().request.post("/api/admin/videos", { headers: { Origin: origin }, data: { provider: "GUMLET", lessonId, assetId: "6192269e0822a81d955d1a4b", expectedAssetId: null } });
  expect(linking.status()).toBe(503);
  expect((await linking.json()).error.code).toBe("CONFIGURATION_REQUIRED");
});

test("Student browser navigation to admin redirects without rendering privileged data", async ({ page }) => {
  await signUp(page.context().request);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Link test videos" })).toHaveCount(0);
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

test("Owned test observations persist and revoked enrollment blocks later measurements", async ({ request }) => {
  const account = await signUp(request);
  await request.post("/api/enrollments", { headers: { Origin: origin }, data: { courseId } });
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: "postgresql://postgres@127.0.0.1:15438/postgres?sslmode=disable", max: 1 }) });
  const attemptId = randomUUID();
  try {
    // Explicit test-only database fixtures. No runtime provider API or playback
    // is substituted; this exercises owned measurements, not live media.
    await prisma.playbackAttempt.create({ data: { id: attemptId, userId: account.user.id, lessonId, provider: "GUMLET", purpose: "comparison", issuanceMs: 1, durationSeconds: 180, expiresAt: new Date(Date.now() + 300_000) } });
    const metric = (data: Record<string, unknown>) => request.post(`/api/measurements/${attemptId}`, { headers: { Origin: origin }, data });
    expect((await metric({ outcome: "playing", firstFrameMs: 250, readyMs: 100, tokenRequestMs: 50 })).status()).toBe(200);
    expect((await metric({ outcome: "ready", readyMs: 999 })).status()).toBe(200);
    const observed = await prisma.playbackAttempt.findUniqueOrThrow({ where: { id: attemptId } });
    expect(observed.outcome).toBe("playing");
    expect(observed.readyMs).toBe(100);
    expect(observed.firstFrameMs).toBe(250);
    await prisma.enrollment.delete({ where: { userId_courseId: { userId: account.user.id, courseId } } });
    const revoked = await metric({ outcome: "ready", readyMs: 100 });
    expect(revoked.status()).toBe(403);
    expect((await revoked.json()).error.code).toBe("NOT_ENROLLED");
  } finally {
    await prisma.playbackAttempt.deleteMany({ where: { id: attemptId } });
    await prisma.$disconnect();
  }
});

test("Secure VDO Streaming home is a small dual-provider test bench, with an unchanged comparison URL", async ({ page }) => {
  await signUp(page.context().request);
  await page.goto("/dashboard");
  await expect(page).toHaveTitle("Secure streaming test · Secure VDO Streaming");
  await expect(page.getByRole("link", { name: "Secure VDO Streaming home" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Secure course-video streaming", exact: true })).toBeVisible();
  await expect(page.getByText("Built for the vdo platform · Gumlet + Bunny Stream", { exact: true })).toBeVisible();
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

test("Public signup, login, and setup pages use vdo platform wording", async ({ page }) => {
  for (const path of ["/signup", "/login", "/setup"]) {
    await page.goto(path);
    await expect(page.locator("#main-content")).toContainText("vdo platform");
  }
});

test("Paired lesson mappings are preferred but missing credentials never unlock a run", async ({ page }) => {
  await signUp(page.context().request);
  await page.context().request.post("/api/enrollments", { headers: { Origin: origin }, data: { courseId } });
  const pairedLessonId = `paired-${randomUUID()}`;
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: "postgresql://postgres@127.0.0.1:15438/postgres?sslmode=disable", max: 1 }) });
  try {
    // Test-only persistence fixtures; no provider request or stream is mocked.
    await prisma.lesson.create({ data: { id: pairedLessonId, courseId, title: "Second isolated test video", description: "Test fixture", module: "Test", position: 2, estimatedSeconds: 0 } });
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
    await prisma.lesson.deleteMany({ where: { id: pairedLessonId } });
    await prisma.$disconnect();
  }
});

test("Removed LMS/import APIs cannot alter historical learner data", async ({ request }) => {
  const account = await signUp(request);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: "postgresql://postgres@127.0.0.1:15438/postgres?sslmode=disable", max: 1 }) });
  try {
    const savedProgress = await prisma.lessonProgress.create({ data: { userId: account.user.id, lessonId, positionSeconds: 45, durationSeconds: 180, percent: 25 } });
    for (const path of ["/api/progress", "/api/admin/videos/import", "/api/admin/videos/catalog"]) {
      const response = await request.post(path, { headers: { Origin: origin }, data: { lessonId, positionSeconds: 170, provider: "GUMLET" } });
      expect(response.status()).toBe(404);
    }
    expect(await prisma.lessonProgress.findUnique({ where: { id: savedProgress.id } })).toEqual(savedProgress);
  } finally { await prisma.$disconnect(); }
});

test("Old course URLs redirect to the test bench instead of an LMS", async ({ page }) => {
  await signUp(page.context().request);
  for (const path of ["/courses", "/courses/web-development-foundations", `/courses/web-development-foundations/lessons/${lessonId}`]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Secure course-video streaming", exact: true })).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Test courses" })).toHaveCount(0);
  }
});

test("Closed or unpublished course access stays blocked in the compact workflow", async ({ page }) => {
  await signUp(page.context().request);
  await page.context().request.post("/api/enrollments", { headers: { Origin: origin }, data: { courseId } });
  await page.goto("/dashboard");
  await page.getByLabel("Test course", { exact: true }).selectOption("cwh-python-essentials");
  await expect(page.getByRole("button", { name: "Enroll for testing", exact: true })).toBeDisabled();
  const denied = await page.context().request.post("/api/enrollments", { headers: { Origin: origin }, data: { courseId: "cwh-python-essentials" } });
  expect(denied.status()).toBe(403);
  expect((await denied.json()).error.code).toBe("ENROLLMENT_CLOSED");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: "postgresql://postgres@127.0.0.1:15438/postgres?sslmode=disable", max: 1 }) });
  try {
    await prisma.course.update({ where: { id: "cwh-python-essentials" }, data: { published: false } });
    await page.reload();
    await expect(page.getByLabel("Test course", { exact: true }).getByRole("option", { name: "Enrollment-denial test course" })).toHaveCount(0);
    const unpublished = await page.context().request.post("/api/enrollments", { headers: { Origin: origin }, data: { courseId: "cwh-python-essentials" } });
    expect(unpublished.status()).toBe(404);
    await expect(page.getByRole("button", { name: "Test without enrollment" })).toBeDisabled();
  } finally {
    await prisma.course.update({ where: { id: "cwh-python-essentials" }, data: { published: true } });
    await prisma.$disconnect();
  }
});
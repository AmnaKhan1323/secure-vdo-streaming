import assert from "node:assert/strict";
import { test } from "node:test";
import { AppError } from "../src/lib/errors";
import { issuePlayback, type PlaybackDependencies } from "../src/lib/server/playback-service";
import { signGumletEmbed } from "../src/lib/server/providers/signing";
import { ASSET_ID, PUBLIC_EXAMPLE_GUMLET_SECRET, protectedAsset, protectionReport } from "./fixtures";

function dependencies() {
  const calls: string[] = [];
  const dependency: PlaybackDependencies = {
    viewer: async () => { calls.push("viewer"); return { id: "viewer", name: "Viewer", email: "viewer@example.test", role: "STUDENT" }; },
    lesson: async () => { calls.push("enrollment"); return { id: "lesson", videos: [{ id: "mapping", provider: "GUMLET", assetId: ASSET_ID, revision: 1, updatedAt: new Date(0) }] }; },
    revalidate: async () => { calls.push("revalidate"); },
    settings: async () => ({ enabled: true, ttlSeconds: 300, allowedDomains: ["courses.example.com"], revision: 0, configurationState: "ready", updatedAt: new Date(0) }),
    adapter: () => ({ getAsset: async () => { calls.push("asset"); return protectedAsset(); }, getProtection: async () => { calls.push("protection"); return protectionReport(); }, signEmbed: (id, expiry) => { calls.push("sign"); return signGumletEmbed(id, PUBLIC_EXAMPLE_GUMLET_SECRET, expiry); } }),
    throttle: async () => { calls.push("throttle"); },
    save: async () => { calls.push("save"); },
    hostname: "courses.example.com",
    now: () => 1795521900123,
  };
  return { dependency, calls };
}

const request = new Request("https://courses.example.com/api/playback", { method: "POST" });
const input = { lessonId: "lesson", provider: "GUMLET", mode: "standard" } as const;

test("Playback authenticates, checks enrollment/protection, revalidates, then signs and commits", async () => {
  const { dependency, calls } = dependencies();
  const ticket = await issuePlayback(request, input, dependency);
  assert.ok(calls.indexOf("viewer") < calls.indexOf("enrollment"));
  assert.ok(calls.indexOf("enrollment") < calls.indexOf("sign"));
  assert.ok(calls.indexOf("protection") < calls.indexOf("revalidate"));
  assert.ok(calls.indexOf("revalidate") < calls.indexOf("sign"));
  assert.ok(calls.indexOf("sign") < calls.indexOf("save"));
  assert.equal(Date.parse(ticket.expiresAt), (1795521900 + 300) * 1000);
  assert.equal(ticket.durationSeconds, 180);
  assert.ok(!JSON.stringify(ticket).includes(PUBLIC_EXAMPLE_GUMLET_SECRET));
});

test("Unauthenticated requests never resolve an asset or invoke a signer", async () => {
  const { dependency, calls } = dependencies();
  dependency.viewer = async () => { throw new AppError("UNAUTHENTICATED", "Sign in.", 401); };
  await assert.rejects(() => issuePlayback(request, input, dependency), (error) => error instanceof AppError && error.status === 401);
  assert.deepEqual(calls, []);
});

test("Non-enrolled viewers never resolve assets or receive tokens", async () => {
  const { dependency, calls } = dependencies();
  dependency.lesson = async () => { throw new AppError("NOT_ENROLLED", "Enroll.", 403); };
  await assert.rejects(() => issuePlayback(request, input, dependency), /Enroll/);
  assert.equal(calls.includes("sign"), false);
  assert.equal(calls.includes("asset"), false);
});

test("Revocation while provider calls run prevents issuance", async () => {
  const { dependency, calls } = dependencies();
  dependency.revalidate = async () => { throw new AppError("NOT_ENROLLED", "Enrollment revoked.", 403); };
  await assert.rejects(() => issuePlayback(request, input, dependency), /revoked/);
  assert.equal(calls.includes("sign"), false);
  assert.equal(calls.includes("save"), false);
});

test("Missing mappings and disabled providers are explicit, never runtime mock streams", async () => {
  const first = dependencies();
  first.dependency.lesson = async () => ({ id: "lesson", videos: [] });
  await assert.rejects(() => issuePlayback(request, input, first.dependency), /link a real provider video/);
  const second = dependencies();
  second.dependency.settings = async () => ({ enabled: false, ttlSeconds: 300, allowedDomains: [], revision: 0, configurationState: "ready", updatedAt: new Date(0) });
  await assert.rejects(() => issuePlayback(request, input, second.dependency), /enable this provider/);
  assert.equal(first.calls.includes("sign"), false);
  assert.equal(second.calls.includes("sign"), false);
});

test("Only an enrolled admin can receive an expired or tampered probe", async () => {
  const student = dependencies();
  await assert.rejects(() => issuePlayback(request, { ...input, mode: "expired" }, student.dependency), /Only administrators/);
  const admin = dependencies();
  admin.dependency.viewer = async () => ({ id: "admin", name: "Admin", email: "admin@example.test", role: "ADMIN" });
  const ticket = await issuePlayback(request, { ...input, mode: "expired" }, admin.dependency);
  assert.ok(Date.parse(ticket.expiresAt) < Date.parse(ticket.serverNow));
  assert.equal(ticket.mode, "expired");
});

test("A failed authorized commit never returns an already-signed URL", async () => {
  const { dependency } = dependencies();
  dependency.save = async () => { throw new AppError("NOT_ENROLLED", "Revoked during commit.", 403); };
  await assert.rejects(() => issuePlayback(request, input, dependency), /during commit/);
});
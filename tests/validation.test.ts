import assert from "node:assert/strict";
import { test } from "node:test";
import { metricsSchema, playbackRequestSchema, providerSettingSchema, videoMappingSchema } from "../src/lib/validation";
import { nextMeasurementOutcome } from "../src/lib/measurement-state";
import { conservativeTokenLifetime } from "../src/lib/playback-clock";
import { trustedPlayerMessage, validTimeUpdate } from "../src/lib/player-messages";
import { ASSET_ID, VIDEO_ID } from "./fixtures";

test("Requests reject spoofed user IDs, roles, provider URLs, and out-of-bounds TTL", () => {
  assert.ok(playbackRequestSchema.safeParse({ lessonId: "lesson", provider: "GUMLET" }).success);
  assert.ok(!playbackRequestSchema.safeParse({ lessonId: "lesson", provider: "GUMLET", userId: "victim" }).success);
  assert.ok(!playbackRequestSchema.safeParse({ lessonId: "lesson", provider: "GUMLET", role: "ADMIN" }).success);
  assert.ok(!playbackRequestSchema.safeParse({ lessonId: "lesson", provider: "GUMLET", ttlSeconds: 999999 }).success);
  assert.ok(!providerSettingSchema.safeParse({ enabled: true, ttlSeconds: 300, allowedDomains: ["https://example.com"], apiKey: "unsafe" }).success);
});

test("Video mapping validates the provider-specific real ID shape", () => {
  assert.ok(videoMappingSchema.safeParse({ lessonId: "lesson", provider: "GUMLET", assetId: ASSET_ID }).success);
  assert.ok(videoMappingSchema.safeParse({ lessonId: "lesson", provider: "BUNNY", assetId: VIDEO_ID }).success);
  assert.ok(!videoMappingSchema.safeParse({ lessonId: "lesson", provider: "GUMLET", assetId: VIDEO_ID }).success);
  assert.ok(!videoMappingSchema.safeParse({ lessonId: "lesson", provider: "BUNNY", assetId: ASSET_ID }).success);
});

test("Playback requests support comparison only, with no learner-progress authority", () => {
  const input = { lessonId: "lesson", provider: "GUMLET" };
  assert.equal(playbackRequestSchema.parse(input).purpose, "comparison");
  assert.ok(!playbackRequestSchema.safeParse({ ...input, purpose: "lesson" }).success);
  assert.ok(!playbackRequestSchema.safeParse({ ...input, completed: true }).success);
  assert.ok(!playbackRequestSchema.safeParse({ ...input, durationSeconds: 1 }).success);
});

test("Initial measurements are accepted; playing requires an observed advancing time", () => {
  assert.ok(metricsSchema.safeParse({ outcome: "issued", tokenRequestMs: 12 }).success);
  assert.ok(!metricsSchema.safeParse({ outcome: "playing" }).success);
  assert.ok(metricsSchema.safeParse({ outcome: "playing", firstFrameMs: 1234 }).success);
  assert.ok(!metricsSchema.safeParse({ outcome: "error", errorCode: "arbitrary-private-url" }).success);
});

test("Delayed readiness, load, or timeout cannot reverse terminal/playing measurements", () => {
  assert.equal(nextMeasurementOutcome("playing", "ready"), "playing");
  assert.equal(nextMeasurementOutcome("playing", "issued"), "playing");
  assert.equal(nextMeasurementOutcome("ready", "timeout"), "ready");
  assert.equal(nextMeasurementOutcome("expired", "playing"), "expired");
  assert.equal(nextMeasurementOutcome("playing", "error"), "error");
});

test("Token countdown conservatively subtracts transport delay", () => {
  assert.equal(conservativeTokenLifetime("2026-11-24T10:05:00Z", "2026-11-24T10:00:00Z", 2000), 298000);
  assert.equal(conservativeTokenLifetime("2026-11-24T09:59:00Z", "2026-11-24T10:00:00Z", 100), 0);
});

test("Player messages must match exact origin, iframe source, context, and shape", () => {
  const source = {} as MessageEventSource;
  const message = { origin: "https://play.gumlet.io", source, data: JSON.stringify({ context: "player.js", event: "ready", value: {} }) };
  assert.ok(trustedPlayerMessage(message, "https://play.gumlet.io", source));
  assert.ok(!trustedPlayerMessage({ ...message, origin: "https://play.gumlet.io.evil.invalid" }, "https://play.gumlet.io", source));
  assert.ok(!trustedPlayerMessage({ ...message, source: {} as MessageEventSource }, "https://play.gumlet.io", source));
  assert.ok(!trustedPlayerMessage({ ...message, data: "malformed" }, "https://play.gumlet.io", source));
  assert.ok(!trustedPlayerMessage({ ...message, data: { context: "other", event: "ready" } }, "https://play.gumlet.io", source));
  assert.ok(!trustedPlayerMessage({ ...message, data: { context: "player.js", event: "invented" } }, "https://play.gumlet.io", source));
  assert.ok(!validTimeUpdate({ seconds: NaN, duration: 2 }));
  assert.ok(!validTimeUpdate({ seconds: 2, duration: 0 }));
});

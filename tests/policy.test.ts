import assert from "node:assert/strict";
import { test } from "node:test";
import { assertPlaybackMode, assertPlaybackPolicy, domainMatches } from "../src/lib/server/providers/policy";
import { AppError } from "../src/lib/errors";
import type { ProtectionReport } from "../src/lib/types";
import { protectedAsset, protectionReport } from "./fixtures";

test("Domain matching is exact or a real wildcard subdomain, never a suffix trick", () => {
  assert.ok(domainMatches("courses.example.com", "courses.example.com"));
  assert.ok(domainMatches("deep.courses.example.com", "*.example.com"));
  assert.ok(!domainMatches("example.com", "*.example.com"));
  assert.ok(!domainMatches("example.com.evil.invalid", "*.example.com"));
  assert.ok(!domainMatches("notexample.com", "*.example.com"));
  assert.ok(!domainMatches("courses.example.com", "*"));
});

test("Complete verified policy authorizes a ready adaptive asset", () => {
  assert.doesNotThrow(() => assertPlaybackPolicy(protectionReport(), protectedAsset(), "courses.example.com", ["courses.example.com"]));
});

const protectionScenarios: Array<{ name: string; report: Partial<ProtectionReport>; code: string }> = [
  { name: "signing disabled", report: { signedPlayback: false }, code: "PROVIDER_PROTECTION_REQUIRED" },
  { name: "CDN tokens disabled", report: { cdnTokens: false }, code: "PROVIDER_PROTECTION_REQUIRED" },
  { name: "downloads enabled", report: { downloadsDisabled: false }, code: "DOWNLOAD_PROTECTION_REQUIRED" },
  { name: "unknown remote domains", report: { allowedDomains: [] }, code: "PROVIDER_DOMAIN_NOT_ALLOWED" },
  { name: "key mismatch", report: { keyMatches: false }, code: "SIGNING_KEY_MISMATCH" },
  { name: "unverifiable key", report: { keyMatches: null }, code: "SIGNING_KEY_UNVERIFIED" },
  { name: "wrong player version", report: { playerHostMatches: false }, code: "PLAYER_VERSION_MISMATCH" },
];
for (const scenario of protectionScenarios) {
  test(`Playback fails closed: ${scenario.name}`, () => {
    assert.throws(() => assertPlaybackPolicy({ ...protectionReport(), ...scenario.report }, protectedAsset(), "courses.example.com", ["courses.example.com"]), (error) => error instanceof AppError && error.code === scenario.code);
  });
}

for (const [name, overrides, code] of [
  ["MP4 exposed", { mp4Exposed: true }, "DOWNLOAD_PROTECTION_REQUIRED"],
  ["MP4 access unknown", { mp4Exposed: null }, "DOWNLOAD_PROTECTION_REQUIRED"],
  ["MP4-only output", { adaptive: false }, "ADAPTIVE_VIDEO_REQUIRED"],
  ["adaptive format unknown", { adaptive: null }, "ADAPTIVE_VIDEO_REQUIRED"],
  ["asset protection unknown", { signedPlayback: null }, "ASSET_PROTECTION_UNVERIFIED"],
  ["asset processing", { ready: false }, "VIDEO_NOT_READY"],
] as const) {
  test(`Playback fails closed: ${name}`, () => assert.throws(() => assertPlaybackPolicy(protectionReport(), { ...protectedAsset(), ...overrides }, "courses.example.com", ["courses.example.com"]), (error) => error instanceof AppError && error.code === code));
}

test("Remote domains cannot be broader than explicitly approved policy", () => {
  assert.throws(() => assertPlaybackPolicy({ ...protectionReport(), allowedDomains: ["courses.example.com", "unapproved.example.com"] }, protectedAsset(), "courses.example.com", ["courses.example.com"]), /outside the local policy/);
  assert.throws(() => assertPlaybackPolicy({ ...protectionReport(), allowedDomains: ["courses.example.com", "*.courses.example.com"] }, protectedAsset(), "courses.example.com", ["courses.example.com"]), /outside the local policy/);
  assert.doesNotThrow(() => assertPlaybackPolicy({ ...protectionReport(), allowedDomains: ["courses.example.com", "*.sub.example.com"] }, protectedAsset(), "courses.example.com", ["*.example.com"]));
});

test("Student cannot request expired, tampered, or custom-lifetime tokens", () => {
  const student = { id: "student", name: "Student", email: "student@example.test", role: "STUDENT" } as const;
  assert.doesNotThrow(() => assertPlaybackMode(student, "standard"));
  assert.throws(() => assertPlaybackMode(student, "expired"));
  assert.throws(() => assertPlaybackMode(student, "tampered"));
  assert.throws(() => assertPlaybackMode(student, "standard", 3600));
  assert.doesNotThrow(() => assertPlaybackMode({ ...student, role: "ADMIN" }, "expired"));
});
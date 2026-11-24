import assert from "node:assert/strict";
import { test } from "node:test";
import { SITE } from "../src/lib/site";
import { testCourses } from "../prisma/test-courses";
import { domainMatches, assertPlaybackPolicy } from "../src/lib/server/providers/policy";
import { protectedAsset, protectionReport } from "./fixtures";

test("Product identity uses vdo platform wording and domains grant no implicit access", () => {
  assert.equal(SITE.name, "Secure VDO Streaming");
  assert.equal(SITE.shortName, "SVS");
  assert.equal(SITE.targetName, "vdo platform");
  assert.ok(!("domain" in SITE) && !("productionDomains" in SITE));
  assert.ok(!domainMatches("www.vdo-platform.example.com", "vdo-platform.example.com"));
  assert.ok(!domainMatches("vdo-platform.example.com.evil.invalid", "vdo-platform.example.com"));
  assert.throws(() => assertPlaybackPolicy(protectionReport(), protectedAsset(), "www.vdo-platform.example.com", ["www.vdo-platform.example.com"]), /remote domain restrictions/);
  assert.doesNotThrow(() => assertPlaybackPolicy({ ...protectionReport(), allowedDomains: ["vdo-platform.example.com", "www.vdo-platform.example.com"] }, protectedAsset(), "www.vdo-platform.example.com", ["vdo-platform.example.com", "www.vdo-platform.example.com"]));
});

test("Fresh setup has two text-only streaming/access fixtures, not full curricula or media", () => {
  assert.equal(testCourses.length, 2);
  assert.equal(testCourses.reduce((sum, course) => sum + course.lessons.length, 0), 2);
  assert.ok(testCourses.every((course) => course.learningOutcomes.length === 0 && course.instructor === "Not assigned"));
  assert.ok(testCourses.every((course) => !("videos" in course) && course.lessons.every((lesson) => !("assetId" in lesson))));
  assert.equal(testCourses.filter((course) => course.openEnrollment).length, 1);
});
import assert from "node:assert/strict";
import { test } from "node:test";
import { SITE } from "../src/lib/site";
import { testCourses } from "../prisma/test-courses";
import { domainMatches, assertPlaybackPolicy } from "../src/lib/server/providers/policy";
import { protectedAsset, protectionReport } from "./fixtures";

test("Product identity is Secure VDO Streaming and target domains grant no implicit access", () => {
  assert.equal(SITE.name, "Secure VDO Streaming");
  assert.equal(SITE.shortName, "SVS");
  assert.equal(SITE.domain, "codewithharry.com");
  assert.ok(!domainMatches("www.codewithharry.com", "codewithharry.com"));
  assert.ok(!domainMatches("codewithharry.com.evil.invalid", "codewithharry.com"));
  assert.throws(() => assertPlaybackPolicy(protectionReport(), protectedAsset(), "www.codewithharry.com", ["www.codewithharry.com"]), /remote domain restrictions/);
  assert.doesNotThrow(() => assertPlaybackPolicy({ ...protectionReport(), allowedDomains: ["codewithharry.com", "www.codewithharry.com"] }, protectedAsset(), "www.codewithharry.com", ["codewithharry.com", "www.codewithharry.com"]));
});

test("Fresh setup has two text-only streaming/access fixtures, not full curricula or media", () => {
  assert.equal(testCourses.length, 2);
  assert.equal(testCourses.reduce((sum, course) => sum + course.lessons.length, 0), 2);
  assert.ok(testCourses.every((course) => course.learningOutcomes.length === 0 && course.instructor === "Not assigned"));
  assert.ok(testCourses.every((course) => !("videos" in course) && course.lessons.every((lesson) => !("assetId" in lesson))));
  assert.equal(testCourses.filter((course) => course.openEnrollment).length, 1);
});
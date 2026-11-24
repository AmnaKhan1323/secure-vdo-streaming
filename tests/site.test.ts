import assert from "node:assert/strict";
import { test } from "node:test";
import { FEATURED_COURSE_IDS, SITE, featuredCourses } from "../src/lib/site";
import { sampleCourses } from "../src/lib/sample-curriculum";
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

test("New coding curricula have independent identities and no assumed videos/instructors", () => {
  assert.deepEqual(sampleCourses.map((course) => course.id), [...FEATURED_COURSE_IDS]);
  assert.equal(sampleCourses.reduce((sum, course) => sum + course.lessons.length, 0), 13);
  assert.ok(sampleCourses.every((course) => course.id.startsWith("cwh-") && !course.id.startsWith("course-")));
  assert.ok(sampleCourses.every((course) => course.instructor === "Instructor to be assigned"));
  assert.ok(sampleCourses.every((course) => !("videos" in course) && course.lessons.every((lesson) => !("assetId" in lesson))));
});

test("Featured coding courses are prioritized without mutating or hiding old content", () => {
  const original = [{ id: "course-fullstack" }, { id: FEATURED_COURSE_IDS[2] }, { id: "operator-course" }, { id: FEATURED_COURSE_IDS[0] }, { id: FEATURED_COURSE_IDS[1] }];
  const order = original.map((course) => course.id);
  assert.deepEqual(featuredCourses(original).map((course) => course.id), [...FEATURED_COURSE_IDS]);
  assert.deepEqual(original.map((course) => course.id), order);
  assert.equal(featuredCourses(original, original.length).length, original.length);
  assert.equal(featuredCourses(original, original.length).at(-1)?.id, "operator-course");
});
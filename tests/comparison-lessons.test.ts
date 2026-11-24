import assert from "node:assert/strict";
import { test } from "node:test";
import { comparisonLessons, hasProviderPair } from "../src/lib/comparison-lessons";

test("Streaming bench selects only enrolled lessons and prioritizes both real mappings", () => {
  const courses = [
    { title: "Existing course", enrollments: [{}], lessons: [
      { id: "unmapped", title: "No mappings yet", videos: [] },
      { id: "single", title: "One provider", videos: [{ provider: "GUMLET" as const }] },
      { id: "paired", title: "Both providers", videos: [{ provider: "GUMLET" as const }, { provider: "BUNNY" as const }] },
    ] },
    { title: "Not enrolled", enrollments: [], lessons: [
      { id: "restricted", title: "Keep inaccessible", videos: [{ provider: "GUMLET" as const }, { provider: "BUNNY" as const }] },
    ] },
  ];
  const original = structuredClone(courses);
  const lessons = comparisonLessons(courses);
  assert.deepEqual(lessons.map((lesson) => lesson.id), ["paired", "single", "unmapped"]);
  assert.ok(hasProviderPair(lessons[0]));
  assert.ok(!hasProviderPair(lessons[1]));
  assert.deepEqual(courses, original, "Preparing the bench must not mutate stored course or lesson identities.");
});

test("Duplicate mappings for one provider cannot unlock a paired run", () => {
  const lessons = comparisonLessons([{ title: "Test", enrollments: [{}], lessons: [
    { id: "duplicate", title: "Not a real pair", videos: [{ provider: "GUMLET" }, { provider: "GUMLET" }] },
  ] }]);
  assert.deepEqual(lessons[0].providers, ["GUMLET"]);
  assert.equal(hasProviderPair(lessons[0]), false);
});
import assert from "node:assert/strict";
import { test } from "node:test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { startLocalDatabase } from "../scripts/local-db";
import { seed, testCourses } from "../prisma/seed";

test("Real PostgreSQL/WASM migration, minimal seed, and historical data preservation", async () => {
  const local = await startLocalDatabase("memory://", 15437);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: local.url, max: 1 }) });
  const administration = new PrismaClient({ adapter: new PrismaPg({ connectionString: local.url, max: 1 }) });
  try {
    await seed(prisma);
    await seed(prisma);
    assert.equal(await prisma.course.count(), 2);
    assert.equal(await prisma.lesson.count(), 2);
    assert.equal(await prisma.user.count(), 0);
    assert.equal(await prisma.lessonVideo.count(), 0);
    assert.equal(await prisma.enrollment.count(), 0);
    assert.equal(await prisma.providerSetting.count({ where: { enabled: true } }), 0);
    const course = await prisma.course.findUniqueOrThrow({ where: { id: "cwh-web-development" } });
    assert.equal(course.learningOutcomes.length, 0);
    await prisma.$transaction(async (transaction) => {
      await transaction.user.create({ data: { id: "test-user", name: "Fixture", email: "fixture@example.test" } });
      await transaction.enrollment.create({ data: { userId: "test-user", courseId: course.id } });
    });
    assert.equal(await prisma.enrollment.count(), 1);
    const rows = await prisma.$transaction((transaction) => transaction.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "Enrollment" WHERE "userId" = ${"test-user"} FOR UPDATE`);
    assert.equal(rows.length, 1);
    // A separate admin CLI must work while the app holds its pool connection.
    await administration.user.update({ where: { id: "test-user" }, data: { role: "ADMIN" } });
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: "test-user" } })).role, "ADMIN");
    await Promise.all([
      prisma.$transaction(async (transaction) => {
        await transaction.user.update({ where: { id: "test-user" }, data: { name: "Committed name" } });
        assert.equal((await transaction.user.findUniqueOrThrow({ where: { id: "test-user" } })).name, "Committed name");
      }),
      administration.$transaction(async (transaction) => {
        await transaction.user.update({ where: { id: "test-user" }, data: { email: "committed@example.test" } });
        assert.equal((await transaction.user.findUniqueOrThrow({ where: { id: "test-user" } })).email, "committed@example.test");
      }),
    ]);
    await assert.rejects(() => prisma.$transaction(async (transaction) => {
      await transaction.user.update({ where: { id: "test-user" }, data: { name: "Must roll back" } });
      throw new Error("Intentional transaction rollback.");
    }));
    assert.equal((await administration.user.findUniqueOrThrow({ where: { id: "test-user" } })).name, "Committed name");
    await prisma.user.delete({ where: { id: "test-user" } });
    assert.equal(await prisma.enrollment.count(), 0);
    // Insert-only rebranding must not relabel old lessons or change learner data.
    const legacyCourse = await prisma.course.create({ data: {
      id: "course-fullstack", slug: "full-stack-foundations", title: "Keep my original course", subtitle: "Existing content",
      description: "Must not be replaced by a different curriculum", category: "Development", level: "Intermediate",
      instructor: "Existing instructor", instructorRole: "Existing role", learningOutcomes: ["Preserve my work"],
    } });
    const legacyLesson = await prisma.lesson.create({ data: {
      id: "course-fullstack-lesson-1", courseId: legacyCourse.id, title: "Existing lesson", description: "Original lesson content",
      module: "Original module", position: 1, estimatedSeconds: 120,
    } });
    await prisma.user.create({ data: { id: "preserved-user", name: "Preserved learner", email: "preserved@example.test", role: "STUDENT" } });
    await prisma.enrollment.create({ data: { userId: "preserved-user", courseId: legacyCourse.id } });
    const savedProgress = await prisma.lessonProgress.create({ data: { userId: "preserved-user", lessonId: legacyLesson.id, percent: 96, completed: true, positionSeconds: 116, durationSeconds: 120 } });
    const savedMapping = await prisma.lessonVideo.create({ data: { lessonId: legacyLesson.id, provider: "GUMLET", assetId: "6192269e0822a81d955d1a4b" } });
    const savedSetting = await prisma.providerSetting.update({ where: { provider: "GUMLET" }, data: { enabled: true, ttlSeconds: 120, allowedDomains: ["www.codewithharry.com"] } });
    // Operator-owned edits to an already-present new sample are also preserved.
    await prisma.course.update({ where: { id: testCourses[0].id }, data: { title: "Operator-owned test course" } });
    await seed(prisma);
    await seed(prisma);
    assert.deepEqual(await prisma.course.findUnique({ where: { id: legacyCourse.id } }), legacyCourse);
    assert.deepEqual(await prisma.lesson.findUnique({ where: { id: legacyLesson.id } }), legacyLesson);
    assert.deepEqual(await prisma.lessonProgress.findUnique({ where: { id: savedProgress.id } }), savedProgress);
    assert.deepEqual(await prisma.lessonVideo.findUnique({ where: { id: savedMapping.id } }), savedMapping);
    assert.deepEqual(await prisma.providerSetting.findUnique({ where: { provider: "GUMLET" } }), savedSetting);
    assert.equal(await prisma.enrollment.count({ where: { userId: "preserved-user", courseId: legacyCourse.id } }), 1);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: "preserved-user" } })).role, "STUDENT");
    assert.equal((await prisma.course.findUniqueOrThrow({ where: { id: testCourses[0].id } })).title, "Operator-owned test course");
    assert.equal(await prisma.course.count(), 3);
    assert.equal(await prisma.lesson.count(), 3);
  } finally { await prisma.$disconnect(); await administration.$disconnect(); await local.close(); }
});
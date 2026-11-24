import assert from "node:assert/strict";
import { test } from "node:test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { beginProviderOperation, finishProviderOperation, failProviderOperation, assertProviderOperation } from "../src/lib/server/provider-configuration";
import { lockIdentity, lockLessonEnrollment, lockVerifiedPlayback } from "../src/lib/server/commit-access";
import { startLocalDatabase } from "../scripts/local-db";
import { seed } from "../prisma/seed";
import type { AuthIdentity } from "../src/lib/server/access-types";

test("Provider operations serialize and invalidate stale issuance using real PostgreSQL", async (context) => {
  const local = await startLocalDatabase("memory://", 15440);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: local.url, max: 1 }) });
  const identity: AuthIdentity = { sessionId: "configuration-test-session", viewer: { id: "configuration-test-admin", name: "Fixture", email: "configuration@example.test", role: "ADMIN" } };
  const input = { enabled: true, ttlSeconds: 300, allowedDomains: ["localhost"] };
  const lessonId = "cwh-web-development-lesson-1";
  try {
    await seed(prisma);
    await prisma.user.create({ data: identity.viewer });
    await prisma.session.create({ data: { id: identity.sessionId, userId: identity.viewer.id, token: "explicit-test-session-only", expiresAt: new Date(Date.now() + 3_600_000) } });
    await prisma.enrollment.create({ data: { userId: identity.viewer.id, courseId: "cwh-web-development" } });
    const mapping = await prisma.lessonVideo.create({ data: { lessonId, provider: "GUMLET", assetId: "6192269e0822a81d955d1a4b" } });
    const setting = await prisma.providerSetting.update({ where: { provider: "GUMLET" }, data: input });
    const verified = { assetId: mapping.assetId, mappingId: mapping.id, mappingRevision: mapping.revision, mappingUpdatedAt: mapping.updatedAt, setting };
    const playbackCommit = () => prisma.$transaction(async (transaction) => { await lockIdentity(transaction, identity); await lockLessonEnrollment(transaction, identity.viewer, lessonId); await lockVerifiedPlayback(transaction, lessonId, "GUMLET", verified); });

    await context.test("Starting an update disables issuance before any remote mutation", async () => {
      const operation = await beginProviderOperation(prisma, identity, "GUMLET", setting.revision);
      const current = await prisma.providerSetting.findUniqueOrThrow({ where: { provider: "GUMLET" } });
      assert.equal(current.enabled, false);
      assert.equal(current.configurationState, "updating");
      await assert.rejects(playbackCommit, /policy changed/);
      await assert.rejects(() => beginProviderOperation(prisma, identity, "GUMLET"), /Another provider update/);
      await finishProviderOperation(prisma, identity, "GUMLET", operation, input);
      await assert.rejects(playbackCommit, /policy changed/, "An unchanged final policy still has a new authority revision.");
    });
    await context.test("A partial failure stays disabled and marks recovery as verification-required", async () => {
      const operation = await beginProviderOperation(prisma, identity, "GUMLET");
      await failProviderOperation(prisma, "GUMLET", operation);
      const failed = await prisma.providerSetting.findUniqueOrThrow({ where: { provider: "GUMLET" } });
      assert.equal(failed.configurationState, "failed");
      assert.equal(failed.enabled, false);
      const recovery = await beginProviderOperation(prisma, identity, "GUMLET");
      assert.equal(recovery.requiresVerification, true);
      await finishProviderOperation(prisma, identity, "GUMLET", recovery, input);
      await failProviderOperation(prisma, "GUMLET", operation);
      assert.equal((await prisma.providerSetting.findUniqueOrThrow({ where: { provider: "GUMLET" } })).enabled, true, "Old cleanup cannot disable a newer successful operation.");
    });
    await context.test("Stale forms cannot overwrite a newer saved configuration", async () => {
      await assert.rejects(() => beginProviderOperation(prisma, identity, "GUMLET", setting.revision), /Reload the current settings/);
    });
    await context.test("Crashed-operation recovery rejects the old owner", async () => {
      const old = await beginProviderOperation(prisma, identity, "GUMLET");
      await prisma.providerSetting.update({ where: { provider: "GUMLET" }, data: { operationStartedAt: new Date(Date.now() - 600_001) } });
      const recovery = await beginProviderOperation(prisma, identity, "GUMLET");
      assert.equal(recovery.requiresVerification, true);
      await assert.rejects(() => assertProviderOperation(prisma, "GUMLET", old), /stale/);
      await assert.rejects(() => finishProviderOperation(prisma, identity, "GUMLET", old, input), /stale/);
      await finishProviderOperation(prisma, identity, "GUMLET", recovery, input);
    });
    await context.test("Identical timestamp A -> B -> A changes invalidate the original mapping revision", async () => {
      const currentSetting = await prisma.providerSetting.findUniqueOrThrow({ where: { provider: "GUMLET" } });
      const snapshot = { ...verified, setting: currentSetting };
      await prisma.lessonVideo.update({ where: { id: mapping.id }, data: { assetId: "aaaaaaaaaaaaaaaaaaaaaaaa", revision: { increment: 1 }, updatedAt: mapping.updatedAt } });
      await prisma.lessonVideo.update({ where: { id: mapping.id }, data: { assetId: mapping.assetId, revision: { increment: 1 }, updatedAt: mapping.updatedAt } });
      await assert.rejects(() => prisma.$transaction((transaction) => lockVerifiedPlayback(transaction, lessonId, "GUMLET", snapshot)), /video changed/);
    });
  } finally { await prisma.$disconnect(); await local.close(); }
});
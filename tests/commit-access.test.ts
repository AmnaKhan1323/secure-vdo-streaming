import assert from "node:assert/strict";
import { test } from "node:test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { AppError } from "../src/lib/errors";
import { lockIdentity, lockLessonEnrollment, lockVerifiedPlayback } from "../src/lib/server/commit-access";
import type { AuthIdentity } from "../src/lib/server/access-types";
import { startLocalDatabase } from "../scripts/local-db";
import { seed } from "../prisma/seed";

test("Authorized commit checks use current locked PostgreSQL rows, not pre-provider snapshots", async (context) => {
  const local = await startLocalDatabase("memory://", 15439);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: local.url, max: 1 }) });
  const identity: AuthIdentity = { sessionId: "test-session", viewer: { id: "test-viewer", name: "Fixture", email: "fixture@example.test", role: "STUDENT" } };
  const lessonId = "cwh-web-development-lesson-1";
  const denied = (code: string) => (error: unknown) => error instanceof AppError && error.code === code;
  try {
    await seed(prisma);
    await prisma.user.create({ data: { id: identity.viewer.id, name: identity.viewer.name, email: identity.viewer.email } });
    const session = { id: identity.sessionId, userId: identity.viewer.id, token: "explicit-test-only-opaque-token", expiresAt: new Date(Date.now() + 300_000) };
    await prisma.session.create({ data: session });
    await prisma.enrollment.create({ data: { userId: identity.viewer.id, courseId: "cwh-web-development" } });
    const mapping = await prisma.lessonVideo.create({ data: { lessonId, provider: "GUMLET", assetId: "6192269e0822a81d955d1a4b" } });
    const setting = await prisma.providerSetting.update({ where: { provider: "GUMLET" }, data: { enabled: true } });
    const verified = { assetId: mapping.assetId, mappingUpdatedAt: mapping.updatedAt, mappingId: mapping.id, mappingRevision: mapping.revision, setting };
    const commit = () => prisma.$transaction(async (transaction) => {
      await lockIdentity(transaction, identity);
      await lockLessonEnrollment(transaction, identity.viewer, lessonId);
      await lockVerifiedPlayback(transaction, lessonId, "GUMLET", verified);
    });
    await context.test("Unchanged authenticated/enrolled state can commit", () => assert.doesNotReject(commit));
    await context.test("Revoked session prevents the commit", async () => {
      await prisma.session.delete({ where: { id: identity.sessionId } });
      await assert.rejects(commit, denied("UNAUTHENTICATED"));
      await prisma.session.create({ data: session });
    });
    await context.test("Expired session prevents the commit", async () => {
      await prisma.session.update({ where: { id: identity.sessionId }, data: { expiresAt: new Date(0) } });
      await assert.rejects(commit, denied("UNAUTHENTICATED"));
      await prisma.session.update({ where: { id: identity.sessionId }, data: { expiresAt: session.expiresAt } });
    });
    await context.test("Role change during provider work prevents the commit", async () => {
      await prisma.user.update({ where: { id: identity.viewer.id }, data: { role: "ADMIN" } });
      await assert.rejects(commit, denied("AUTHORIZATION_CHANGED"));
      await prisma.user.update({ where: { id: identity.viewer.id }, data: { role: "STUDENT" } });
    });
    await context.test("Replacing a verified video prevents stale issuance", async () => {
      await prisma.lessonVideo.update({ where: { id: mapping.id }, data: { assetId: "aaaaaaaaaaaaaaaaaaaaaaaa", revision: { increment: 1 } } });
      await assert.rejects(commit, denied("PLAYBACK_CONFIGURATION_CHANGED"));
      await prisma.lessonVideo.update({ where: { id: mapping.id }, data: { assetId: mapping.assetId, revision: mapping.revision, updatedAt: mapping.updatedAt } });
    });
    await context.test("Disabling or changing provider policy prevents stale issuance", async () => {
      await prisma.providerSetting.update({ where: { provider: "GUMLET" }, data: { enabled: false } });
      await assert.rejects(commit, denied("PLAYBACK_CONFIGURATION_CHANGED"));
      await prisma.providerSetting.update({ where: { provider: "GUMLET" }, data: { enabled: true, ttlSeconds: 60 } });
      await assert.rejects(commit, denied("PLAYBACK_CONFIGURATION_CHANGED"));
      await prisma.providerSetting.update({ where: { provider: "GUMLET" }, data: { ttlSeconds: setting.ttlSeconds, updatedAt: setting.updatedAt } });
    });
    await context.test("Revoked enrollment prevents the commit", async () => {
      await prisma.enrollment.delete({ where: { userId_courseId: { userId: identity.viewer.id, courseId: "cwh-web-development" } } });
      await assert.rejects(commit, denied("NOT_ENROLLED"));
    });
  } finally { await prisma.$disconnect(); await local.close(); }
});
import { AppError } from "@/lib/errors";
import { progressSchema } from "@/lib/validation";
import { requireIdentity, requireLessonAccess } from "@/lib/server/authorization";
import { db } from "@/lib/server/db";
import { apiRoute, assertSameOrigin, json, rateLimit, readJson } from "@/lib/server/http";
import { Prisma } from "@/generated/prisma/client";
import { assertSessionActive, lockIdentity, lockLessonEnrollment, lockVideoMapping } from "@/lib/server/commit-access";
import { acceptProgressUpdate } from "@/lib/progress-order";

export const runtime = "nodejs";
export const POST = apiRoute(async (request) => {
  assertSameOrigin(request);
  const identity = await requireIdentity(request);
  const viewer = identity.viewer;
  const input = await readJson(request, progressSchema);
  await requireLessonAccess(viewer, input.lessonId);
  await rateLimit(viewer.id, "progress", 40);
  const result = await db().$transaction(async (transaction) => {
    const sessionExpiresAt = await lockIdentity(transaction, identity);
    await lockLessonEnrollment(transaction, viewer, input.lessonId);
    const attempts = await transaction.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT "id" FROM "PlaybackAttempt" WHERE "id" = ${input.attemptId} AND "userId" = ${viewer.id} AND "lessonId" = ${input.lessonId} FOR SHARE`);
    const attempt = attempts.length ? await transaction.playbackAttempt.findUnique({ where: { id: input.attemptId } }) : null;
    if (!attempt || attempt.mode !== "standard" || !attempt.assetId || !attempt.assetMappedAt || attempt.expiresAt.getTime() <= Date.now()) throw new AppError("PLAYBACK_SESSION_EXPIRED", "Request a fresh authorized lesson playback session before saving progress.", 403);
    if (attempt.purpose !== "lesson") throw new AppError("COMPARISON_PROGRESS_DISABLED", "Comparison runs record observations only; they cannot change lesson progress.", 403);
    const mapping = await lockVideoMapping(transaction, input.lessonId, attempt.provider);
    if (mapping.assetId !== attempt.assetId || mapping.updatedAt.getTime() !== attempt.assetMappedAt.getTime()) throw new AppError("PLAYBACK_CONFIGURATION_CHANGED", "The lesson video changed. Start a new playback session before saving progress.", 409);
    const duration = attempt.durationSeconds;
    if (duration <= 0 || input.positionSeconds > duration + 2) throw new AppError("INVALID_PROGRESS", "Progress position is outside the verified video duration.");
    const position = Math.min(duration, input.positionSeconds);
    const percent = Math.min(100, position / duration * 100);
    const previous = await transaction.lessonProgress.findUnique({ where: { userId_lessonId: { userId: viewer.id, lessonId: input.lessonId } } });
    if (!acceptProgressUpdate(previous, attempt, input.sequence)) { assertSessionActive(sessionExpiresAt); return { saved: false, completed: previous?.completed ?? false, percent: previous?.percent ?? 0 }; }
    const completed = previous?.completed === true || percent >= 95;
    const order = { playbackAttemptId: attempt.id, playbackStartedAt: attempt.createdAt, sequence: input.sequence };
    const progress = await transaction.lessonProgress.upsert({
      where: { userId_lessonId: { userId: viewer.id, lessonId: input.lessonId } },
      create: { userId: viewer.id, lessonId: input.lessonId, positionSeconds: position, durationSeconds: duration, percent, completed, completedAt: completed ? new Date() : null, ...order },
      update: { positionSeconds: position, durationSeconds: duration, percent: Math.max(previous?.percent ?? 0, percent), completed, completedAt: previous?.completedAt ?? (completed ? new Date() : null), ...order },
    });
    assertSessionActive(sessionExpiresAt);
    if (attempt.expiresAt.getTime() <= Date.now()) throw new AppError("PLAYBACK_SESSION_EXPIRED", "This playback session expired before progress could be saved.", 403);
    return { saved: true, completed: progress.completed, percent: progress.percent };
  });
  return json(result);
});
import { AppError } from "@/lib/errors";
import { metricsSchema } from "@/lib/validation";
import { requireIdentity, requireLessonAccess } from "@/lib/server/authorization";
import { db } from "@/lib/server/db";
import { assertSameOrigin, handleApiError, json, rateLimit, readJson } from "@/lib/server/http";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { nextMeasurementOutcome } from "@/lib/measurement-state";
import type { PlaybackMetrics } from "@/lib/types";
import { assertSessionActive, lockIdentity, lockLessonEnrollment } from "@/lib/server/commit-access";

export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const identity = await requireIdentity(request);
    const viewer = identity.viewer;
    const idResult = z.uuid().safeParse((await context.params).id);
    if (!idResult.success) throw new AppError("INVALID_REQUEST", "Invalid attempt ID.");
    const id = idResult.data;
    const input = await readJson(request, metricsSchema);
    const attempt = await db().playbackAttempt.findFirst({ where: { id, userId: viewer.id } });
    if (!attempt) throw new AppError("NOT_FOUND", "Playback attempt not found.", 404);
    await requireLessonAccess(viewer, attempt.lessonId);
    await rateLimit(viewer.id, "metrics", 60);
    if (Date.now() > attempt.createdAt.getTime() + 4 * 60 * 60 * 1000) throw new AppError("MEASUREMENT_CLOSED", "This playback attempt no longer accepts measurements.", 410);
    await db().$transaction(async (transaction) => {
      const sessionExpiresAt = await lockIdentity(transaction, identity);
      await lockLessonEnrollment(transaction, viewer, attempt.lessonId);
      const locked = await transaction.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT "id" FROM "PlaybackAttempt" WHERE "id" = ${id} AND "userId" = ${viewer.id} FOR UPDATE`);
      if (!locked.length) throw new AppError("NOT_FOUND", "Playback attempt no longer exists.", 404);
      const current = await transaction.playbackAttempt.findUniqueOrThrow({ where: { id } });
      if (Date.now() > current.createdAt.getTime() + 4 * 60 * 60 * 1000) throw new AppError("MEASUREMENT_CLOSED", "This playback attempt no longer accepts measurements.", 410);
      const outcome = nextMeasurementOutcome(current.outcome as PlaybackMetrics["outcome"], input.outcome);
      await transaction.playbackAttempt.update({ where: { id }, data: {
        outcome,
        tokenRequestMs: current.tokenRequestMs ?? input.tokenRequestMs,
        iframeLoadMs: current.iframeLoadMs ?? input.iframeLoadMs,
        readyMs: current.readyMs ?? input.readyMs,
        firstFrameMs: current.firstFrameMs ?? input.firstFrameMs,
        errorCode: outcome === input.outcome ? input.errorCode ?? current.errorCode : current.errorCode,
      } });
      assertSessionActive(sessionExpiresAt);
    });
    return json({ saved: true });
  } catch (error) { return handleApiError(error); }
}
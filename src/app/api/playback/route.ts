import { playbackRequestSchema } from "@/lib/validation";
import { requireIdentity, requireLessonAccess } from "@/lib/server/authorization";
import { appOrigin } from "@/lib/server/env";
import { db } from "@/lib/server/db";
import { apiRoute, assertSameOrigin, json, rateLimit, readJson } from "@/lib/server/http";
import { providerAdapter } from "@/lib/server/providers";
import { issuePlayback } from "@/lib/server/playback-service";
import { AppError } from "@/lib/errors";
import { assertSessionActive, lockIdentity, lockLessonEnrollment, lockVerifiedPlayback } from "@/lib/server/commit-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = apiRoute(async (request) => {
  assertSameOrigin(request);
  const input = await readJson(request, playbackRequestSchema);
  const identity = await requireIdentity(request);
  const ticket = await issuePlayback(request, input, {
    viewer: async () => identity.viewer,
    lesson: requireLessonAccess,
    revalidate: async (request, viewer, lessonId) => {
      const current = await requireIdentity(request);
      if (current.viewer.id !== viewer.id || current.viewer.role !== viewer.role || current.sessionId !== identity.sessionId) throw new AppError("AUTHORIZATION_CHANGED", "Your session permissions changed. Request a new session.", 403);
      await requireLessonAccess(current.viewer, lessonId);
    },
    settings: (provider) => db().providerSetting.findUnique({ where: { provider } }),
    adapter: providerAdapter,
    throttle: (userId) => rateLimit(userId, "playback", 12),
    save: async (attempt, viewer, verified) => {
      await db().$transaction(async (transaction) => {
        const sessionExpiresAt = await lockIdentity(transaction, identity);
        await lockLessonEnrollment(transaction, viewer, attempt.lessonId);
        await lockVerifiedPlayback(transaction, attempt.lessonId, attempt.provider, verified);
        if (attempt.mode === "standard" && attempt.expiresAt.getTime() <= Date.now()) throw new AppError("PLAYBACK_SESSION_EXPIRED", "Token expired before the authorized commit completed.", 409);
        await transaction.playbackAttempt.create({ data: attempt });
        assertSessionActive(sessionExpiresAt);
        if (attempt.mode === "standard" && attempt.expiresAt.getTime() <= Date.now()) throw new AppError("PLAYBACK_SESSION_EXPIRED", "Token expired before the authorized commit completed.", 409);
      });
    },
    hostname: new URL(appOrigin()).hostname,
  });
  return json(ticket);
});
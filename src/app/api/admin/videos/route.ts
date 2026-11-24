import { AppError } from "@/lib/errors";
import { videoMappingSchema } from "@/lib/validation";
import { requireAdminIdentity } from "@/lib/server/authorization";
import { db } from "@/lib/server/db";
import { apiRoute, assertSameOrigin, json, rateLimit, readJson } from "@/lib/server/http";
import { providerAdapter } from "@/lib/server/providers";
import { Prisma } from "@/generated/prisma/client";
import { assertSessionActive, lockIdentity } from "@/lib/server/commit-access";

export const runtime = "nodejs";
export const POST = apiRoute(async (request) => {
  assertSameOrigin(request);
  const identity = await requireAdminIdentity(request);
  const viewer = identity.viewer;
  await rateLimit(viewer.id, "video-map", 20);
  const input = await readJson(request, videoMappingSchema);
  const lesson = await db().lesson.findUnique({ where: { id: input.lessonId } });
  if (!lesson) throw new AppError("NOT_FOUND", "Lesson not found.", 404);
  const before = await db().lessonVideo.findUnique({ where: { lessonId_provider: { lessonId: input.lessonId, provider: input.provider } } });
  if ((before?.assetId ?? null) !== input.expectedAssetId) throw new AppError("MAPPING_CONFLICT", "The current video mapping differs from the one confirmed. Refresh and explicitly approve a replacement.", 409);
  const asset = await providerAdapter(input.provider).getAsset(input.assetId);
  await db().$transaction(async (transaction) => {
    const sessionExpiresAt = await lockIdentity(transaction, identity, true);
    const lessons = await transaction.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT "id" FROM "Lesson" WHERE "id" = ${input.lessonId} FOR UPDATE`);
    if (!lessons.length) throw new AppError("NOT_FOUND", "Lesson was removed before linking completed.", 404);
    const current = await transaction.lessonVideo.findUnique({ where: { lessonId_provider: { lessonId: input.lessonId, provider: input.provider } } });
    if ((current?.assetId ?? null) !== input.expectedAssetId || current?.id !== before?.id || current?.revision !== before?.revision) throw new AppError("MAPPING_CONFLICT", "The video mapping changed during verification. Refresh before linking again.", 409);
    await transaction.lessonVideo.upsert({ where: { lessonId_provider: { lessonId: input.lessonId, provider: input.provider } }, create: { lessonId: input.lessonId, provider: input.provider, assetId: input.assetId }, update: current?.assetId === input.assetId ? {} : { assetId: input.assetId, revision: { increment: 1 } } });
    assertSessionActive(sessionExpiresAt);
  });
  return json({ lessonId: input.lessonId, provider: input.provider, asset, message: asset.ready ? "Video linked to the lesson." : "Video linked; playback will remain blocked until processing finishes." });
});
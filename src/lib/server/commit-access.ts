import { Prisma } from "@/generated/prisma/client";
import { AppError } from "@/lib/errors";
import type { Viewer, VideoProvider } from "@/lib/types";
import type { AuthIdentity } from "./access-types";

/** Database-only helpers: caller supplies its transaction. No credentials or
 * global clients are accessed here; real PostgreSQL tests exercise these locks.
 */
export async function lockIdentity(transaction: Prisma.TransactionClient, identity: AuthIdentity, requireAdmin = false) {
  const users = await transaction.$queryRaw<{ role: string }[]>(Prisma.sql`SELECT "role" FROM "User" WHERE "id" = ${identity.viewer.id} FOR SHARE`);
  if (!users.length || users[0].role !== identity.viewer.role || (requireAdmin && users[0].role !== "ADMIN")) {
    throw new AppError("AUTHORIZATION_CHANGED", "Account permissions changed before this operation completed.", 403);
  }
  const sessions = await transaction.$queryRaw<{ expiresAt: Date }[]>(Prisma.sql`SELECT "expiresAt" FROM "Session" WHERE "id" = ${identity.sessionId} AND "userId" = ${identity.viewer.id} FOR SHARE`);
  if (!sessions.length) {
    throw new AppError("UNAUTHENTICATED", "This session was revoked or expired before the operation completed.", 401);
  }
  assertSessionActive(sessions[0].expiresAt);
  return sessions[0].expiresAt;
}

export function assertSessionActive(expiresAt: Date) {
  if (expiresAt.getTime() <= Date.now()) throw new AppError("UNAUTHENTICATED", "This session expired before the operation completed.", 401);
}

export async function lockLessonEnrollment(transaction: Prisma.TransactionClient, viewer: Viewer, lessonId: string) {
  const lessons = await transaction.$queryRaw<{ courseId: string; published: boolean }[]>(Prisma.sql`SELECT l."courseId", c."published" FROM "Lesson" l JOIN "Course" c ON c."id" = l."courseId" WHERE l."id" = ${lessonId} FOR SHARE OF l, c`);
  if (!lessons.length || (!lessons[0].published && viewer.role !== "ADMIN")) throw new AppError("NOT_FOUND", "Lesson is no longer available.", 404);
  const enrollments = await transaction.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT "id" FROM "Enrollment" WHERE "userId" = ${viewer.id} AND "courseId" = ${lessons[0].courseId} FOR UPDATE`);
  if (!enrollments.length) throw new AppError("NOT_ENROLLED", "Enrollment was revoked before this operation completed.", 403);
  return lessons[0].courseId;
}

export async function lockVideoMapping(transaction: Prisma.TransactionClient, lessonId: string, provider: VideoProvider) {
  const mappings = await transaction.$queryRaw<{ assetId: string; updatedAt: Date }[]>(Prisma.sql`SELECT "assetId", "updatedAt" FROM "LessonVideo" WHERE "lessonId" = ${lessonId} AND "provider" = ${provider}::"Provider" FOR SHARE`);
  if (!mappings.length) throw new AppError("VIDEO_NOT_CONFIGURED", "The lesson video mapping was removed.", 409);
  return mappings[0];
}

export type VerifiedPlaybackState = {
  assetId: string;
  mappingUpdatedAt: Date;
  setting: { enabled: boolean; ttlSeconds: number; allowedDomains: string[]; updatedAt: Date };
};

export async function lockVerifiedPlayback(transaction: Prisma.TransactionClient, lessonId: string, provider: VideoProvider, verified: VerifiedPlaybackState) {
  const mapping = await lockVideoMapping(transaction, lessonId, provider);
  const settings = await transaction.$queryRaw<{ enabled: boolean; ttlSeconds: number; allowedDomains: string[]; updatedAt: Date }[]>(Prisma.sql`SELECT "enabled", "ttlSeconds", "allowedDomains", "updatedAt" FROM "ProviderSetting" WHERE "provider" = ${provider}::"Provider" FOR SHARE`);
  const current = settings[0];
  if (mapping.assetId !== verified.assetId || mapping.updatedAt.getTime() !== verified.mappingUpdatedAt.getTime()) {
    throw new AppError("PLAYBACK_CONFIGURATION_CHANGED", "The lesson video changed during authorization. Request playback again.", 409);
  }
  if (!current?.enabled || current.updatedAt.getTime() !== verified.setting.updatedAt.getTime()
    || current.ttlSeconds !== verified.setting.ttlSeconds
    || JSON.stringify(current.allowedDomains) !== JSON.stringify(verified.setting.allowedDomains)) {
    throw new AppError("PLAYBACK_CONFIGURATION_CHANGED", "The provider policy changed during authorization. Request playback again.", 409);
  }
}
import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/errors";
import type { PlaybackMode, PlaybackTicket, ProtectionReport, ProviderAsset, VideoProvider, Viewer } from "@/lib/types";
import { assertPlaybackMode, assertPlaybackPolicy } from "./providers/policy";
import { tamperEmbedToken } from "./providers/signing";
import type { VerifiedPlaybackState } from "./commit-access";

type Settings = VerifiedPlaybackState["setting"];
type LessonAccess = { id: string; videos: { provider: VideoProvider; assetId: string; updatedAt: Date }[] };
type Adapter = { getAsset(id: string): Promise<ProviderAsset>; getProtection(): Promise<ProtectionReport>; signEmbed(id: string, expires: number, instanceId: string): string };

export type PlaybackDependencies = {
  viewer(request: Request): Promise<Viewer>;
  lesson(viewer: Viewer, lessonId: string): Promise<LessonAccess>;
  revalidate(request: Request, viewer: Viewer, lessonId: string): Promise<void>;
  settings(provider: VideoProvider): Promise<Settings | null>;
  adapter(provider: VideoProvider): Adapter;
  throttle(viewerId: string): Promise<void>;
  save(attempt: { id: string; userId: string; lessonId: string; provider: VideoProvider; assetId: string; assetMappedAt: Date; purpose: "lesson" | "comparison"; mode: string; issuanceMs: number; durationSeconds: number; expiresAt: Date }, viewer: Viewer, verified: VerifiedPlaybackState): Promise<void>;
  hostname: string;
  now?: () => number;
};

/** Dependency-injected authorization pipeline, also exercised by offline security tests. */
export async function issuePlayback(request: Request, input: { lessonId: string; provider: VideoProvider; mode: PlaybackMode; purpose?: "lesson" | "comparison"; ttlSeconds?: number }, dependencies: PlaybackDependencies): Promise<PlaybackTicket> {
  const started = performance.now();
  const viewer = await dependencies.viewer(request);
  assertPlaybackMode(viewer, input.mode, input.ttlSeconds);
  const lesson = await dependencies.lesson(viewer, input.lessonId);
  await dependencies.throttle(viewer.id);
  const mapping = lesson.videos.find((video) => video.provider === input.provider);
  if (!mapping) throw new AppError("VIDEO_NOT_CONFIGURED", "An administrator must link a real provider video to this lesson first.", 409);
  const settings = await dependencies.settings(input.provider);
  if (!settings?.enabled) throw new AppError("PROVIDER_DISABLED", "An administrator must configure and enable this provider first.", 503);
  const adapter = dependencies.adapter(input.provider);
  const [asset, protection] = await Promise.all([adapter.getAsset(mapping.assetId), adapter.getProtection()]);
  assertPlaybackPolicy(protection, asset, dependencies.hostname, settings.allowedDomains);
  // Slow upstream calls cannot silently retain a revoked session/enrollment/role.
  await dependencies.revalidate(request, viewer, lesson.id);
  const now = (dependencies.now ?? Date.now)();
  const ttlSeconds = input.ttlSeconds ?? settings.ttlSeconds;
  const expires = Math.floor(now / 1000) + (input.mode === "expired" ? -60 : ttlSeconds);
  const attemptId = randomUUID();
  let embedUrl = adapter.signEmbed(mapping.assetId, expires, attemptId);
  if (input.mode === "tampered") embedUrl = tamperEmbedToken(embedUrl, input.provider);
  const issuanceMs = performance.now() - started;
  const expiresAt = new Date(expires * 1000);
  await dependencies.save({ id: attemptId, userId: viewer.id, lessonId: lesson.id, provider: input.provider, assetId: mapping.assetId, assetMappedAt: mapping.updatedAt, purpose: input.purpose ?? "lesson", mode: input.mode, issuanceMs, durationSeconds: asset.durationSeconds, expiresAt }, viewer, { assetId: mapping.assetId, mappingUpdatedAt: mapping.updatedAt, setting: settings });
  if (input.mode === "standard" && (dependencies.now ?? Date.now)() >= expiresAt.getTime()) throw new AppError("PLAYBACK_SESSION_EXPIRED", "The token expired before issuance completed. Request a fresh session.", 409);
  return { attemptId, provider: input.provider, mode: input.mode, embedUrl, expiresAt: expiresAt.toISOString(), serverNow: new Date(now).toISOString(), ttlSeconds: input.mode === "expired" ? 0 : ttlSeconds, issuanceMs, durationSeconds: asset.durationSeconds };
}
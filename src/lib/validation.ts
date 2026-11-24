import { z } from "zod";

export const providerSchema = z.enum(["GUMLET", "BUNNY"]);
export const idSchema = z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/);
export const assetIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/);
export const bunnyVideoIdSchema = z.uuid();
export const hostnameSchema = z.string().trim().toLowerCase().min(1).max(253)
  .regex(/^(?:\*\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/, "Use a hostname, such as localhost or courses.example.com (no scheme, path, or port).");

export const playbackRequestSchema = z.object({
  lessonId: idSchema,
  provider: providerSchema,
  mode: z.enum(["standard", "expired", "tampered"]).default("standard"),
  purpose: z.literal("comparison").default("comparison"),
  ttlSeconds: z.number().int().min(30).max(3600).optional(),
}).strict();

export const enrollmentSchema = z.object({ courseId: idSchema }).strict();

const timing = z.number().finite().min(0).max(3_600_000).optional();
export const metricsSchema = z.object({
  tokenRequestMs: timing,
  iframeLoadMs: timing,
  readyMs: timing,
  firstFrameMs: timing,
  outcome: z.enum(["issued", "ready", "playing", "error", "timeout", "expired", "cancelled"]),
  errorCode: z.enum(["PLAYER_ERROR", "PLAYER_TIMEOUT", "CLIENT_EXPIRED"]).optional(),
}).strict().refine((value) => value.outcome !== "playing" || value.firstFrameMs !== undefined, {
  message: "Playback success requires an advancing media-time observation.",
});

export const providerSettingSchema = z.object({
  enabled: z.boolean(),
  ttlSeconds: z.number().int().min(60).max(3600),
  allowedDomains: z.array(hostnameSchema).min(1).max(20).transform((values) => [...new Set(values)]),
  applyRemote: z.boolean().default(false),
  expectedRevision: z.number().int().nonnegative().optional(),
}).strict();

export const videoMappingSchema = z.object({
  lessonId: idSchema,
  provider: providerSchema,
  assetId: z.string().min(1).max(64),
  expectedAssetId: z.string().min(1).max(64).nullable().default(null),
}).strict().superRefine((value, context) => {
  const result = (value.provider === "GUMLET" ? assetIdSchema : bunnyVideoIdSchema).safeParse(value.assetId);
  if (!result.success) context.addIssue({ code: "custom", path: ["assetId"], message: "Invalid asset ID for this provider." });
});


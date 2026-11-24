import { z } from "zod";
import type { ProtectionReport, ProviderAsset } from "@/lib/types";
import { bunnyVideoIdSchema } from "@/lib/validation";
import { AppError } from "@/lib/errors";
import { providerRequest, type Fetcher } from "./transport";
import { secretsEqual, signBunnyEmbed, type BunnyPlayerHost } from "./signing";

const videoSchema = z.object({
  guid: bunnyVideoIdSchema,
  videoLibraryId: z.number().int().positive(),
  title: z.string(),
  status: z.number().int(),
  length: z.number().finite().nonnegative(),
  hasMP4Fallback: z.boolean().optional(),
});

const librarySchema = z.object({
  Id: z.number().int().positive(),
  PullZoneId: z.number().int().positive(),
  PlayerTokenAuthenticationEnabled: z.boolean(),
  AllowedReferrers: z.array(z.string()).nullable().optional(),
  BlockNoneReferrer: z.boolean(),
  AllowDirectPlay: z.boolean(),
  EnableMP4Fallback: z.boolean(),
  ExposeOriginals: z.boolean(),
  AllowEarlyPlay: z.boolean().nullable().optional(),
  PlayerVersion: z.number().int(),
});

const edgeRuleSchema = z.object({ Enabled: z.boolean(), ActionType: z.number(), ExtraActions: z.array(z.object({ ActionType: z.number() })).nullable().optional() });
const pullZoneSchema = z.object({
  Id: z.number().int().positive(),
  ZoneSecurityEnabled: z.boolean(),
  ZoneSecurityKey: z.string().nullable().optional(),
  EdgeRules: z.array(edgeRuleSchema).nullable().optional(),
});

export type BunnyCredentials = { streamApiKey: string; coreApiKey: string; libraryId: string; tokenAuthKey: string; playerHost: BunnyPlayerHost };

export class BunnyAdapter {
  constructor(private readonly credentials: BunnyCredentials, private readonly fetcher: Fetcher = fetch) {
    if (!/^[1-9]\d*$/.test(credentials.libraryId)) throw new AppError("INVALID_LIBRARY", "Bunny library ID must be a positive integer.", 503);
  }

  private stream<T>(path: string, schema: z.ZodType<T>, body?: unknown) {
    return providerRequest(this.fetcher, "Bunny Stream", `https://video.bunnycdn.com/library/${this.credentials.libraryId}${path}`, "AccessKey", this.credentials.streamApiKey, schema, body);
  }

  private core<T>(path: string, schema: z.ZodType<T>, body?: unknown, allowEmpty = false) {
    return providerRequest(this.fetcher, "Bunny Core", `https://api.bunny.net${path}`, "AccessKey", this.credentials.coreApiKey, schema, body, allowEmpty);
  }

  private toAsset(video: z.infer<typeof videoSchema>): ProviderAsset {
    return { id: video.guid, title: video.title, status: ["Created", "Uploaded", "Processing", "Transcoding", "Ready", "Error", "Upload failed", "JIT segmenting", "JIT playlists ready"][video.status] ?? `Status ${video.status}`, ready: video.status === 4, durationSeconds: video.length, scopeId: String(video.videoLibraryId), mp4Exposed: video.hasMP4Fallback ?? null, adaptive: video.status === 4, signedPlayback: null };
  }

  async getAsset(id: string) {
    bunnyVideoIdSchema.parse(id);
    const video = await this.stream(`/videos/${id}`, videoSchema);
    if (String(video.videoLibraryId) !== this.credentials.libraryId) throw new AppError("ASSET_SCOPE_MISMATCH", "The Bunny video is not in the configured library.", 403);
    return this.toAsset(video);
  }

  async listAssets(page = 1) {
    const response = await this.stream(`/videos?page=${page}&itemsPerPage=20&orderBy=date`, z.object({ items: z.array(videoSchema), totalItems: z.number().int().nonnegative() }));
    return { assets: response.items.map((video) => this.toAsset(video)), total: response.totalItems, page, pageSize: 20 };
  }

  async importVideo(title: string, sourceUrl: string) {
    const result = await this.stream("/videos/fetch", z.object({ success: z.boolean(), statusCode: z.number().optional() }), { url: sourceUrl, title });
    if (!result.success) throw new AppError("PROVIDER_IMPORT_REJECTED", "Bunny rejected the remote import. Check the accessible source URL and library quota.", 502);
    // Official FetchVideo response is StatusModel, not a VideoModel/GUID.
    return { assetId: null, status: "accepted", message: "Bunny accepted the fetch. Refresh its real catalog after processing and explicitly select the resulting video. Fetch does not return a documented video ID." };
  }

  private async library() {
    const library = await this.core(`/videolibrary/${this.credentials.libraryId}`, librarySchema);
    if (String(library.Id) !== this.credentials.libraryId) throw new AppError("PROVIDER_RESPONSE_INVALID", "Bunny returned a different library.", 502);
    return library;
  }

  async getProtection(): Promise<ProtectionReport> {
    const library = await this.library();
    const zone = await this.core(`/pullzone/${library.PullZoneId}`, pullZoneSchema);
    if (zone.Id !== library.PullZoneId) throw new AppError("PROVIDER_RESPONSE_INVALID", "Bunny returned a different Pull Zone.", 502);
    // Omitted/null rules or early-play flags are unknown, not proof of safety.
    const rulesKnown = Array.isArray(zone.EdgeRules);
    const bypass = zone.EdgeRules?.some((rule) => rule.Enabled && (rule.ActionType === 8 || rule.ExtraActions?.some((action) => action.ActionType === 8))) ?? false;
    return {
      provider: "BUNNY",
      checkedAt: new Date().toISOString(),
      signedPlayback: library.PlayerTokenAuthenticationEnabled,
      cdnTokens: zone.ZoneSecurityEnabled && rulesKnown && !bypass,
      allowedDomains: library.BlockNoneReferrer ? library.AllowedReferrers ?? [] : [],
      downloadsDisabled: !library.AllowDirectPlay && !library.EnableMP4Fallback && !library.ExposeOriginals && library.AllowEarlyPlay === false,
      keyMatches: zone.ZoneSecurityKey ? secretsEqual(zone.ZoneSecurityKey, this.credentials.tokenAuthKey) : null,
      playerHostMatches: library.PlayerVersion === (this.credentials.playerHost === "player.mediadelivery.net" ? 2 : 1),
      warnings: [
        ...(!library.BlockNoneReferrer ? ["Enable BlockNoneReferrer: requests without a referrer are currently allowed."] : []),
        ...(bypass ? ["An enabled Pull Zone edge rule bypasses token authentication."] : []),
        ...(!rulesKnown ? ["Pull Zone edge rules were not reported; token-bypass protection is unverified."] : []),
        ...(library.AllowEarlyPlay == null ? ["Early-play state was not reported; original exposure cannot be verified."] : []),
        "Embed tokens are not CDN tokens or DRM. Verify unsigned manifests, segments, thumbnails, and expiry in a browser.",
      ],
    };
  }

  async applyProtection(domains: string[], authorize: () => Promise<void> = async () => {}) {
    const library = await this.library();
    // Core API fields are documented; never invent BlockDirectPlay or rotate keys.
    await authorize();
    await this.core(`/videolibrary/${this.credentials.libraryId}`, z.object({}).passthrough(), {
      PlayerTokenAuthenticationEnabled: true,
      BlockNoneReferrer: true,
      AllowDirectPlay: false,
      EnableMP4Fallback: false,
      ExposeOriginals: false,
      AllowEarlyPlay: false,
    });
    for (const hostname of domains) {
      if (!library.AllowedReferrers?.includes(hostname)) {
        await authorize();
        await this.core(`/videolibrary/${this.credentials.libraryId}/addAllowedReferrer`, z.object({}).passthrough(), { Hostname: hostname }, true);
      }
    }
    await authorize();
    await this.core(`/pullzone/${library.PullZoneId}`, z.object({}).passthrough(), { ZoneSecurityEnabled: true });
    // Existing Bunny allowed domains are not silently removed. Review them in its console.
    return this.getProtection();
  }

  signEmbed(assetId: string, expires: number) {
    return signBunnyEmbed(this.credentials.libraryId, assetId, this.credentials.tokenAuthKey, expires, this.credentials.playerHost);
  }
}
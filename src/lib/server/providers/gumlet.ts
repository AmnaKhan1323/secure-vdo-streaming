import { z } from "zod";
import type { ProtectionReport, ProviderAsset } from "@/lib/types";
import { assetIdSchema } from "@/lib/validation";
import { AppError } from "@/lib/errors";
import { SITE } from "@/lib/site";
import { providerRequest, type Fetcher } from "./transport";
import { decodeGumletSecret, secretsEqual, signGumletEmbed, type GumletSecretEncoding } from "./signing";

const assetSchema = z.object({
  asset_id: assetIdSchema,
  workspace_id: z.string().optional(),
  status: z.string(),
  input: z.object({
    title: z.string().optional(),
    duration: z.number().finite().nonnegative().optional(),
    transformations: z.object({ mp4_access: z.boolean().optional(), format: z.string().optional() }).optional(),
  }).optional(),
  output: z.object({ format: z.string().optional() }).optional(),
  video_protection: z.object({ signed_url: z.boolean().optional() }).optional(),
});

const workspaceSchema = z.object({
  id: z.string(),
  on_streaming_halt: z.boolean().optional(),
  player_config: z.object({ enable_download_button: z.boolean().optional() }).optional(),
  video_protection: z.object({
    signed_url: z.boolean().optional(),
    signed_url_secret: z.string().optional(),
    whitelisted_referrers: z.array(z.string()).optional(),
  }).optional(),
});

export type GumletCredentials = { apiKey: string; workspaceId: string; signingSecret: string; secretEncoding?: GumletSecretEncoding; remoteSecretEncoding?: GumletSecretEncoding };

export class GumletAdapter {
  constructor(private readonly credentials: GumletCredentials, private readonly fetcher: Fetcher = fetch) {
    assetIdSchema.parse(credentials.workspaceId);
    decodeGumletSecret(credentials.signingSecret, credentials.secretEncoding);
  }

  private request<T>(path: string, schema: z.ZodType<T>, body?: unknown) {
    return providerRequest(this.fetcher, "Gumlet", `https://api.gumlet.com/v1${path}`, "Authorization", `Bearer ${this.credentials.apiKey}`, schema, body);
  }

  private toAsset(asset: z.infer<typeof assetSchema>): ProviderAsset {
    const format = asset.output?.format?.toLowerCase();
    return {
      id: asset.asset_id,
      title: asset.input?.title ?? `Asset ${asset.asset_id}`,
      scopeId: asset.workspace_id ?? "",
      status: asset.status,
      ready: asset.status === "ready",
      durationSeconds: asset.input?.duration ?? 0,
      mp4Exposed: asset.input?.transformations?.mp4_access ?? null,
      adaptive: format ? ["abr", "hls", "dash", "mpeg-dash"].includes(format) : null,
      signedPlayback: asset.video_protection?.signed_url ?? null,
    };
  }

  async getAsset(id: string) {
    assetIdSchema.parse(id);
    const asset = await this.request(`/video/assets/${id}`, assetSchema);
    if (asset.workspace_id !== this.credentials.workspaceId) throw new AppError("ASSET_SCOPE_MISMATCH", "The Gumlet asset is not in the configured workspace.", 403);
    if (asset.video_protection?.signed_url === false) throw new AppError("UNPROTECTED_ASSET", "Signed playback is disabled for this Gumlet asset.", 503);
    return this.toAsset(asset);
  }

  async listAssets(page = 1) {
    const response = await this.request(`/video/assets/list/${this.credentials.workspaceId}?page_number=${page}&page_size=20&sortBy=created_at&orderBy=desc`, z.object({ all_assets: z.array(assetSchema), total_asset_count: z.number().int().nonnegative() }));
    return { assets: response.all_assets.map((asset) => this.toAsset(asset)), total: response.total_asset_count, page, pageSize: 20 };
  }

  async importVideo(title: string, sourceUrl: string) {
    const response = await this.request("/video/assets", z.object({ asset_id: assetIdSchema, status: z.string() }), {
      workspace_id: this.credentials.workspaceId, input: sourceUrl, title, format: "ABR", mp4_access: false,
    });
    return { assetId: response.asset_id, status: response.status, message: "Gumlet accepted the video. Wait for processing, then link it to a lesson from the provider catalog." };
  }

  async getProtection(): Promise<ProtectionReport> {
    const workspace = await this.request(`/video/workspaces/${this.credentials.workspaceId}`, workspaceSchema);
    if (workspace.id !== this.credentials.workspaceId) throw new AppError("PROVIDER_RESPONSE_INVALID", "Gumlet returned a different workspace.", 502);
    const protection = workspace.video_protection;
    return {
      provider: "GUMLET",
      checkedAt: new Date().toISOString(),
      signedPlayback: protection?.signed_url === true && workspace.on_streaming_halt !== true,
      cdnTokens: protection?.signed_url === true,
      allowedDomains: protection?.whitelisted_referrers ?? [],
      downloadsDisabled: workspace.player_config?.enable_download_button === false,
      keyMatches: protection?.signed_url_secret ? secretsEqual(decodeGumletSecret(protection.signed_url_secret, this.credentials.remoteSecretEncoding ?? this.credentials.secretEncoding).toString("hex"), decodeGumletSecret(this.credentials.signingSecret, this.credentials.secretEncoding).toString("hex")) : null,
      playerHostMatches: true,
      warnings: ["Each asset must also report MP4 access disabled. Signed URLs and referrers are not DRM."],
    };
  }

  async applyProtection(domains: string[], authorize: () => Promise<void> = async () => {}) {
    // Documented POST update; do not rotate or transmit the signing secret.
    await authorize();
    await this.request(`/video/workspaces/${this.credentials.workspaceId}`, z.object({}).passthrough(), {
      video_protection: { signed_url: true, whitelisted_referrers: domains },
    });
    // enable_download_button appears in GET but not the documented update body.
    // Disable it manually in Gumlet's dashboard; never invent an update parameter.
    return this.getProtection();
  }

  signEmbed(assetId: string, expires: number, instanceId: string) {
    // Documented watermark parameter is included BEFORE signing, also making embeds unique.
    return signGumletEmbed(assetId, this.credentials.signingSecret, expires, [["watermark_text", `${SITE.name} ${instanceId.slice(0, 8)}`]], this.credentials.secretEncoding);
  }
}
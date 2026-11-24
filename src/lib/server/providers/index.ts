import "server-only";
import { AppError } from "@/lib/errors";
import type { ProviderSettingsView, VideoProvider } from "@/lib/types";
import { db } from "@/lib/server/db";
import { providerConfiguration, requiredEnv } from "@/lib/server/env";
import { GumletAdapter } from "./gumlet";
import { BunnyAdapter } from "./bunny";

export function providerAdapter(provider: VideoProvider) {
  if (provider === "GUMLET") {
    const encoding = process.env.GUMLET_SIGNING_SECRET_ENCODING ?? "base64";
    const remoteEncoding = process.env.GUMLET_REMOTE_SECRET_ENCODING ?? encoding;
    if ((encoding !== "base64" && encoding !== "hex") || (remoteEncoding !== "base64" && remoteEncoding !== "hex")) throw new AppError("INVALID_SIGNING_SECRET", "Explicitly choose base64 or hex for the Gumlet key representations.", 503);
    return new GumletAdapter({ apiKey: requiredEnv("GUMLET_API_KEY"), workspaceId: requiredEnv("GUMLET_WORKSPACE_ID"), signingSecret: requiredEnv("GUMLET_SIGNING_SECRET"), secretEncoding: encoding, remoteSecretEncoding: remoteEncoding });
  }
  const host = process.env.BUNNY_PLAYER_HOST?.trim() || "player.mediadelivery.net";
  if (host !== "player.mediadelivery.net" && host !== "iframe.mediadelivery.net") throw new AppError("INVALID_PLAYER_HOST", "BUNNY_PLAYER_HOST must be a documented Bunny player hostname.", 503);
  return new BunnyAdapter({ streamApiKey: requiredEnv("BUNNY_STREAM_API_KEY"), coreApiKey: requiredEnv("BUNNY_CORE_API_KEY"), libraryId: requiredEnv("BUNNY_LIBRARY_ID"), tokenAuthKey: requiredEnv("BUNNY_TOKEN_AUTH_KEY"), playerHost: host });
}

export async function providerSettings(): Promise<ProviderSettingsView[]> {
  const settings = await db().providerSetting.findMany();
  return (["GUMLET", "BUNNY"] as const).map((provider) => {
    const setting = settings.find((item) => item.provider === provider);
    return { provider, enabled: setting?.enabled ?? false, ttlSeconds: setting?.ttlSeconds ?? 300, allowedDomains: setting?.allowedDomains ?? [], ...providerConfiguration(provider) };
  });
}
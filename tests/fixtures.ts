import type { ProtectionReport, ProviderAsset } from "../src/lib/types";

// Explicit offline contract fixtures, never imported by application runtime.
export const ASSET_ID = "6192269e0822a81d955d1a4b";
export const WORKSPACE_ID = "5f462c1561cf8a766464ffc4";
export const VIDEO_ID = "11111111-1111-4111-8111-111111111111";
export const LIBRARY_ID = "123456";
export const PUBLIC_EXAMPLE_GUMLET_SECRET = "GNCP2ePfmdV3bHKqbiBAlXQXHKmI9+DZfLVptsvgUU4=";
export const TEST_BUNNY_KEY = "test-token-auth-key";

export function protectedAsset(): ProviderAsset {
  return { id: ASSET_ID, title: "Fixture video", status: "ready", ready: true, durationSeconds: 180, scopeId: WORKSPACE_ID, mp4Exposed: false, adaptive: true, signedPlayback: true };
}

export function protectionReport(): ProtectionReport {
  return { provider: "GUMLET", checkedAt: "2026-11-24T09:00:00.000Z", signedPlayback: true, cdnTokens: true, allowedDomains: ["courses.example.com"], downloadsDisabled: true, keyMatches: true, playerHostMatches: true, warnings: [] };
}

export const gumletAssetResponse = {
  asset_id: ASSET_ID, workspace_id: WORKSPACE_ID, status: "ready", progress: 100,
  input: { title: "Fixture video", duration: 180, source_url: "https://private-source.invalid/private.mp4?token=never-return-source-token", transformations: { format: "ABR", mp4_access: false } },
  output: { format: "abr", playback_url: "https://video.gumlet.io/private?token=never-return-playback-token" },
  video_protection: { signed_url: true },
};

export const gumletWorkspaceResponse = {
  id: WORKSPACE_ID, on_streaming_halt: false, player_config: { enable_download_button: false },
  channel_settings: { password: "never-return-channel-password" },
  video_protection: { signed_url: true, signed_url_secret: PUBLIC_EXAMPLE_GUMLET_SECRET, whitelisted_referrers: ["courses.example.com"] },
};

export const bunnyVideoResponse = { guid: VIDEO_ID, videoLibraryId: Number(LIBRARY_ID), title: "Fixture video", status: 4, length: 180, hasMP4Fallback: false, thumbnailUrl: "https://private.invalid/thumbnail?token=never-return-thumbnail-token" };
export const bunnyLibraryResponse = { Id: Number(LIBRARY_ID), PullZoneId: 42, PlayerTokenAuthenticationEnabled: true, AllowedReferrers: ["courses.example.com"], BlockNoneReferrer: true, AllowDirectPlay: false, EnableMP4Fallback: false, ExposeOriginals: false, AllowEarlyPlay: false, PlayerVersion: 2, ApiKey: "never-return-library-api-key" };
export const bunnyZoneResponse = { Id: 42, ZoneSecurityEnabled: true, ZoneSecurityKey: TEST_BUNNY_KEY, EdgeRules: [], AWSSigningSecret: "never-return-aws-secret" };
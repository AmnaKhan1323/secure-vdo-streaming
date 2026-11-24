export const PROVIDERS = ["GUMLET", "BUNNY"] as const;
export type VideoProvider = (typeof PROVIDERS)[number];
export type PlaybackMode = "standard" | "expired" | "tampered";

export const PROVIDER_META = {
  GUMLET: { name: "Gumlet", short: "G", color: "violet", signature: "HMAC-SHA1 · signed embed" },
  BUNNY: { name: "Bunny Stream", short: "B", color: "blue", signature: "SHA-256 · embed token" },
} as const;

export type Viewer = { id: string; name: string; email: string; role: "STUDENT" | "ADMIN" };

export type PlaybackTicket = {
  attemptId: string;
  provider: VideoProvider;
  mode: PlaybackMode;
  embedUrl: string;
  expiresAt: string;
  serverNow: string;
  ttlSeconds: number;
  issuanceMs: number;
  durationSeconds: number;
};

export type PlaybackMetrics = {
  tokenRequestMs?: number;
  iframeLoadMs?: number;
  readyMs?: number;
  firstFrameMs?: number;
  outcome: "issued" | "ready" | "playing" | "error" | "timeout" | "expired" | "cancelled";
  errorCode?: "PLAYER_ERROR" | "PLAYER_TIMEOUT" | "CLIENT_EXPIRED";
};

export type ProviderAsset = {
  id: string;
  title: string;
  status: string;
  ready: boolean;
  durationSeconds: number;
  scopeId: string;
  mp4Exposed: boolean | null;
  adaptive: boolean | null;
  signedPlayback: boolean | null;
};

export type ProtectionReport = {
  provider: VideoProvider;
  checkedAt: string;
  signedPlayback: boolean;
  cdnTokens: boolean;
  allowedDomains: string[];
  downloadsDisabled: boolean;
  keyMatches: boolean | null;
  playerHostMatches: boolean;
  warnings: string[];
};

export type ProviderSettingsView = {
  provider: VideoProvider;
  enabled: boolean;
  ttlSeconds: number;
  allowedDomains: string[];
  configured: boolean;
  missing: string[];
  revision: number;
  configurationState: string;
};
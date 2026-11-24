import { AppError } from "@/lib/errors";
import type { PlaybackMode, ProtectionReport, ProviderAsset, Viewer } from "@/lib/types";

export function domainMatches(hostname: string, domain: string) {
  const host = hostname.toLowerCase();
  const allowed = domain.trim().toLowerCase();
  if (allowed.startsWith("*.")) return host.endsWith(`.${allowed.slice(2)}`) && host !== allowed.slice(2);
  return host === allowed;
}

export function assertPlaybackPolicy(report: ProtectionReport, asset: ProviderAsset, hostname: string, localDomains: string[]) {
  if (!localDomains.some((domain) => domainMatches(hostname, domain))) throw new AppError("DOMAIN_NOT_ALLOWED", "Add this application hostname to the provider's local allowed-domain settings.", 403);
  if (!report.allowedDomains.length || !report.allowedDomains.some((domain) => domainMatches(hostname, domain))) throw new AppError("PROVIDER_DOMAIN_NOT_ALLOWED", "The provider's remote domain restrictions do not allow this application.", 503);
  const extraDomains = report.allowedDomains.filter((remote) => !localDomains.some((local) => {
    if (remote.startsWith("*.")) return local.startsWith("*.") && (local === remote || domainMatches(remote.slice(2), local));
    return domainMatches(remote, local);
  }));
  if (extraDomains.length) throw new AppError("PROVIDER_ALLOWLIST_TOO_BROAD", "The remote provider allows domains outside the local policy. Remove extras in its console or explicitly approve them in the local allowed-domain list.", 503);
  if (!report.signedPlayback || !report.cdnTokens) throw new AppError("PROVIDER_PROTECTION_REQUIRED", "Enable both signed/embed playback and underlying media token protection at the provider.", 503);
  if (asset.adaptive !== true) throw new AppError("ADAPTIVE_VIDEO_REQUIRED", "A verified adaptive-streaming asset is required; MP4-only or unknown outputs are not accepted.", 503);
  if (report.provider === "GUMLET" && asset.signedPlayback !== true) throw new AppError("ASSET_PROTECTION_UNVERIFIED", "Gumlet must report effective signed playback enabled for this asset. Unknown asset protection fails closed.", 503);
  if (!report.downloadsDisabled || asset.mp4Exposed !== false) throw new AppError("DOWNLOAD_PROTECTION_REQUIRED", "Disable direct downloads, original exposure, and MP4 generation/fallback before using protected playback.", 503);
  if (report.keyMatches === false) throw new AppError("SIGNING_KEY_MISMATCH", "The server signing key does not match the provider's current token key.", 503);
  if (report.keyMatches === null) throw new AppError("SIGNING_KEY_UNVERIFIED", "The provider did not return a verifiable current signing key. Check account permissions and the documented key representation.", 503);
  if (!report.playerHostMatches) throw new AppError("PLAYER_VERSION_MISMATCH", "The configured Bunny player host does not match the library's PlayerVersion.", 503);
  if (!asset.ready || asset.durationSeconds <= 0) throw new AppError("VIDEO_NOT_READY", "The video is still processing or has no verified duration. Refresh its catalog status and try again.", 409);
}

export function assertPlaybackMode(viewer: Viewer, mode: PlaybackMode, ttlOverride?: number) {
  if (viewer.role !== "ADMIN" && (mode !== "standard" || ttlOverride !== undefined)) throw new AppError("FORBIDDEN", "Only administrators can generate negative-test tokens or override token expiry.", 403);
}
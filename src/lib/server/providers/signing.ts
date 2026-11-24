import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "@/lib/errors";
import { assetIdSchema, bunnyVideoIdSchema } from "@/lib/validation";

export type BunnyPlayerHost = "player.mediadelivery.net" | "iframe.mediadelivery.net";
export type GumletSecretEncoding = "base64" | "hex";

export function decodeGumletSecret(secret: string, encoding: GumletSecretEncoding = "base64") {
  if (encoding === "hex") {
    if (!/^(?:[a-fA-F0-9]{2}){16,64}$/.test(secret)) throw new AppError("INVALID_SIGNING_SECRET", "The explicitly hex-encoded Gumlet key must represent at least 16 bytes.", 503);
    return Buffer.from(secret, "hex");
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(secret) || secret.length % 4 !== 0) {
    throw new AppError("INVALID_SIGNING_SECRET", "Gumlet signing requires the Base64 key representation used in its official iframe example.", 503);
  }
  const bytes = Buffer.from(secret, "base64");
  if (bytes.length < 16 || bytes.toString("base64") !== secret) {
    throw new AppError("INVALID_SIGNING_SECRET", "Verify the Base64-encoded Gumlet signing secret with your workspace configuration.", 503);
  }
  return bytes;
}

function validateExpiry(expires: number) {
  if (!Number.isSafeInteger(expires) || expires <= 0 || expires >= 10_000_000_000) {
    throw new AppError("INVALID_EXPIRY", "Expiry must be an absolute Unix timestamp in seconds.");
  }
}

/** Official iframe algorithm, NOT the direct HLS/DASH algorithm.
 * https://docs.gumlet.com/video/manage-videos/video-protection-settings-section#signed-url
 */
export function signGumletEmbed(assetId: string, secret: string, expires: number, params: ReadonlyArray<readonly [string, string]> = [], encoding: GumletSecretEncoding = "base64") {
  assetIdSchema.parse(assetId);
  validateExpiry(expires);
  if (params.some(([key]) => key === "signed_token" || key === "signed_expires")) throw new AppError("INVALID_QUERY", "Signing parameters cannot be supplied twice.");
  const query = new URLSearchParams(params.map(([key, value]) => [key, value])).toString();
  const path = `/embed/${assetId}${query ? `?${query}` : ""}`;
  const separator = query ? "&" : "?";
  const message = `${path}${separator}signed_expires=${expires}`;
  const token = createHmac("sha1", decodeGumletSecret(secret, encoding)).update(message).digest("hex");
  return `https://play.gumlet.io${path}${separator}signed_token=${token}&signed_expires=${expires}`;
}

/** https://bunny.net/docs/stream/player/signed-embeds.md */
export function signBunnyEmbed(libraryId: string, videoId: string, key: string, expires: number, host: BunnyPlayerHost = "player.mediadelivery.net") {
  if (!/^[1-9]\d*$/.test(libraryId)) throw new AppError("INVALID_LIBRARY", "Bunny library ID must be a positive integer.", 503);
  bunnyVideoIdSchema.parse(videoId);
  validateExpiry(expires);
  if (!key) throw new AppError("INVALID_SIGNING_SECRET", "Bunny token authentication key is required.", 503);
  if (!["player.mediadelivery.net", "iframe.mediadelivery.net"].includes(host)) throw new AppError("INVALID_PLAYER_HOST", "Select a documented Bunny player host.", 503);
  const token = createHash("sha256").update(key + videoId + String(expires)).digest("hex");
  const query = new URLSearchParams({ token, expires: String(expires), autoplay: "false", preload: "true" });
  return `https://${host}/embed/${libraryId}/${videoId}?${query}`;
}

export function tamperEmbedToken(embedUrl: string, provider: "GUMLET" | "BUNNY") {
  const url = new URL(embedUrl);
  const key = provider === "GUMLET" ? "signed_token" : "token";
  const token = url.searchParams.get(key);
  if (!token) throw new AppError("INVALID_TOKEN", "No embed token to tamper with.");
  url.searchParams.set(key, (token[0] === "0" ? "1" : "0") + token.slice(1));
  return url.toString();
}

export function secretsEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
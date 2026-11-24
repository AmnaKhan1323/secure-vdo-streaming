import "server-only";
import { AppError } from "@/lib/errors";
import type { VideoProvider } from "@/lib/types";

const providerKeys = {
  GUMLET: ["GUMLET_API_KEY", "GUMLET_WORKSPACE_ID", "GUMLET_SIGNING_SECRET"],
  BUNNY: ["BUNNY_STREAM_API_KEY", "BUNNY_LIBRARY_ID", "BUNNY_TOKEN_AUTH_KEY", "BUNNY_CORE_API_KEY"],
} as const;

export function requiredEnv(key: string) {
  const value = process.env[key]?.trim();
  if (!value) throw new AppError("CONFIGURATION_REQUIRED", `Configure ${key} on the server before continuing.`, 503);
  return value;
}

export function authConfigured() {
  return Boolean(process.env.DATABASE_URL && process.env.BETTER_AUTH_URL && (process.env.BETTER_AUTH_SECRET?.length ?? 0) >= 32);
}

export function appOrigin() {
  const raw = requiredEnv("BETTER_AUTH_URL");
  let url: URL;
  try { url = new URL(raw); } catch { throw new AppError("CONFIGURATION_REQUIRED", "BETTER_AUTH_URL must be a valid application URL.", 503); }
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash || !["https:", "http:"].includes(url.protocol)) {
    throw new AppError("CONFIGURATION_REQUIRED", "BETTER_AUTH_URL must contain only the application origin.", 503);
  }
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new AppError("CONFIGURATION_REQUIRED", "Production authentication requires HTTPS.", 503);
  }
  return url.origin;
}

export function providerConfiguration(provider: VideoProvider) {
  const missing = providerKeys[provider].filter((key) => !process.env[key]?.trim());
  return { configured: missing.length === 0, missing: [...missing] };
}
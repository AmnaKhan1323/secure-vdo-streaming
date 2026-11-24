import "dotenv/config";
import { config } from "dotenv";
import assert from "node:assert/strict";
import { test } from "node:test";
import { GumletAdapter } from "../../src/lib/server/providers/gumlet";
import { BunnyAdapter } from "../../src/lib/server/providers/bunny";

config({ path: ".env.local", quiet: true });

const gumletReady = ["GUMLET_API_KEY", "GUMLET_WORKSPACE_ID", "GUMLET_SIGNING_SECRET", "LIVE_GUMLET_ASSET_ID"].every((key) => Boolean(process.env[key]));
const bunnyReady = ["BUNNY_STREAM_API_KEY", "BUNNY_LIBRARY_ID", "BUNNY_TOKEN_AUTH_KEY", "BUNNY_CORE_API_KEY", "LIVE_BUNNY_VIDEO_ID"].every((key) => Boolean(process.env[key]));

function gumlet() {
  const encoding = process.env.GUMLET_SIGNING_SECRET_ENCODING ?? "base64";
  const remote = process.env.GUMLET_REMOTE_SECRET_ENCODING ?? encoding;
  if ((encoding !== "base64" && encoding !== "hex") || (remote !== "base64" && remote !== "hex")) throw new Error("Invalid explicit Gumlet key encoding.");
  return new GumletAdapter({ apiKey: process.env.GUMLET_API_KEY!, workspaceId: process.env.GUMLET_WORKSPACE_ID!, signingSecret: process.env.GUMLET_SIGNING_SECRET!, secretEncoding: encoding, remoteSecretEncoding: remote });
}

function bunny() {
  const host = process.env.BUNNY_PLAYER_HOST ?? "player.mediadelivery.net";
  if (host !== "player.mediadelivery.net" && host !== "iframe.mediadelivery.net") throw new Error("Invalid Bunny player host.");
  return new BunnyAdapter({ streamApiKey: process.env.BUNNY_STREAM_API_KEY!, coreApiKey: process.env.BUNNY_CORE_API_KEY!, libraryId: process.env.BUNNY_LIBRARY_ID!, tokenAuthKey: process.env.BUNNY_TOKEN_AUTH_KEY!, playerHost: host });
}

test("LIVE Gumlet: real asset API, workspace protection, and signed iframe structure", { skip: !gumletReady ? "Requires private Gumlet credentials and LIVE_GUMLET_ASSET_ID" : false }, async () => {
  const adapter = gumlet();
  const asset = await adapter.getAsset(process.env.LIVE_GUMLET_ASSET_ID!);
  const report = await adapter.getProtection();
  assert.equal(asset.ready, true, "Live asset must have completed processing.");
  assert.equal(asset.adaptive, true);
  assert.equal(asset.signedPlayback, true, "Unknown effective asset signing fails closed.");
  assert.equal(asset.mp4Exposed, false);
  assert.equal(report.signedPlayback, true);
  assert.equal(report.downloadsDisabled, true);
  assert.equal(report.keyMatches, true, "Provider signing key must be verifiable and match.");
  assert.ok(report.allowedDomains.length > 0);
  const url = new URL(adapter.signEmbed(asset.id, Math.floor(Date.now() / 1000) + 300, "live-api-test"));
  assert.equal(url.origin, "https://play.gumlet.io");
  assert.ok(url.searchParams.get("signed_token"));
});

test("LIVE Bunny: real asset API, embed security, and linked Pull Zone tokens", { skip: !bunnyReady ? "Requires private Bunny Stream/Core credentials and LIVE_BUNNY_VIDEO_ID" : false }, async () => {
  const adapter = bunny();
  const asset = await adapter.getAsset(process.env.LIVE_BUNNY_VIDEO_ID!);
  const report = await adapter.getProtection();
  assert.equal(asset.ready, true);
  assert.equal(asset.mp4Exposed, false);
  assert.equal(report.signedPlayback, true);
  assert.equal(report.cdnTokens, true);
  assert.equal(report.downloadsDisabled, true);
  assert.equal(report.playerHostMatches, true);
  assert.equal(report.keyMatches, true, "Provider token key must be verifiable and match.");
  assert.ok(report.allowedDomains.length > 0);
  const url = new URL(adapter.signEmbed(asset.id, Math.floor(Date.now() / 1000) + 300));
  assert.ok(url.searchParams.get("token"));
  assert.ok(url.searchParams.get("expires"));
});

async function embedHttpProbe(provider: "GUMLET" | "BUNNY") {
  const expires = Math.floor(Date.now() / 1000) + 300;
  const referrer = process.env.BETTER_AUTH_URL;
  if (!referrer) throw new Error("BETTER_AUTH_URL must match a real provider-allowed domain for HTTP probes.");
  const url = provider === "GUMLET" ? gumlet().signEmbed(process.env.LIVE_GUMLET_ASSET_ID!, expires, "live-http-test") : bunny().signEmbed(process.env.LIVE_BUNNY_VIDEO_ID!, expires);
  let response: Response;
  try { response = await fetch(url, { headers: { Referer: referrer }, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15000) }); }
  catch { throw new Error("Live player HTTP probe could not reach the provider. No URL or token was logged."); }
  await response.body?.cancel();
  // This checks HTTP shell reachability only. It never claims ready/media playback.
  assert.equal(response.status, 200, "Provider iframe HTTP shell should be reachable; browser playback still requires verification.");
}

test("LIVE Gumlet HTTP iframe shell reachability (NOT playback success)", { skip: !(gumletReady && process.env.LIVE_EMBED_PROBES === "true") ? "Requires credentials and explicit LIVE_EMBED_PROBES=true" : false }, () => embedHttpProbe("GUMLET"));
test("LIVE Bunny HTTP iframe shell reachability (NOT playback success)", { skip: !(bunnyReady && process.env.LIVE_EMBED_PROBES === "true") ? "Requires credentials and explicit LIVE_EMBED_PROBES=true" : false }, () => embedHttpProbe("BUNNY"));
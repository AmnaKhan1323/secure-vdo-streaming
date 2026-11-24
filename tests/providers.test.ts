import assert from "node:assert/strict";
import { test } from "node:test";
import { GumletAdapter } from "../src/lib/server/providers/gumlet";
import { BunnyAdapter } from "../src/lib/server/providers/bunny";
import type { Fetcher } from "../src/lib/server/providers/transport";
import { ASSET_ID, LIBRARY_ID, PUBLIC_EXAMPLE_GUMLET_SECRET, TEST_BUNNY_KEY, VIDEO_ID, WORKSPACE_ID, bunnyLibraryResponse, bunnyVideoResponse, bunnyZoneResponse, gumletAssetResponse, gumletWorkspaceResponse } from "./fixtures";

function transport(responses: Array<unknown | Response>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetcher: Fetcher = async (url, init) => {
    calls.push({ url: String(url), init });
    if (!responses.length) throw new Error("Unexpected fixture request.");
    const next = responses.shift();
    return next instanceof Response ? next : Response.json(next);
  };
  return { calls, fetcher };
}

function gumlet(fetcher: Fetcher) { return new GumletAdapter({ apiKey: "fixture-gumlet-api-key", workspaceId: WORKSPACE_ID, signingSecret: PUBLIC_EXAMPLE_GUMLET_SECRET }, fetcher); }
function bunny(fetcher: Fetcher) { return new BunnyAdapter({ streamApiKey: "fixture-stream-key", coreApiKey: "fixture-core-key", libraryId: LIBRARY_ID, tokenAuthKey: TEST_BUNNY_KEY, playerHost: "player.mediadelivery.net" }, fetcher); }

test("Gumlet asset endpoint/header are exact and DTO excludes private URLs", async () => {
  const fixture = transport([gumletAssetResponse]);
  const asset = await gumlet(fixture.fetcher).getAsset(ASSET_ID);
  assert.equal(fixture.calls[0].url, `https://api.gumlet.com/v1/video/assets/${ASSET_ID}`);
  assert.equal((fixture.calls[0].init?.headers as Record<string, string>).Authorization, "Bearer fixture-gumlet-api-key");
  assert.equal(asset.ready, true);
  assert.equal(asset.adaptive, true);
  assert.equal(asset.signedPlayback, true);
  assert.ok(!JSON.stringify(asset).includes("never-return"));
  assert.equal(fixture.calls[0].init?.cache, "no-store");
  assert.equal(fixture.calls[0].init?.redirect, "error");
});

test("Gumlet refuses a different workspace and explicitly unsigned asset", async () => {
  await assert.rejects(() => gumlet(transport([{ ...gumletAssetResponse, workspace_id: "other-workspace" }]).fetcher).getAsset(ASSET_ID), /configured workspace/);
  await assert.rejects(() => gumlet(transport([{ ...gumletAssetResponse, video_protection: { signed_url: false } }]).fetcher).getAsset(ASSET_ID), /disabled/);
});

test("Gumlet MP4-only/unknown asset state is preserved for fail-closed policy", async () => {
  const asset = await gumlet(transport([{ ...gumletAssetResponse, output: { format: "MP4" }, video_protection: undefined }]).fetcher).getAsset(ASSET_ID);
  assert.equal(asset.adaptive, false);
  assert.equal(asset.signedPlayback, null);
});

test("Gumlet protection DTO never returns signing secret or channel password", async () => {
  const fixture = transport([gumletWorkspaceResponse]);
  const report = await gumlet(fixture.fetcher).getProtection();
  assert.equal(report.keyMatches, true);
  assert.equal(report.downloadsDisabled, true);
  assert.ok(!JSON.stringify(report).includes(PUBLIC_EXAMPLE_GUMLET_SECRET));
  assert.ok(!JSON.stringify(report).includes("never-return-channel-password"));
});

test("Gumlet remote updates do not invent the download-button field or rotate keys", async () => {
  const fixture = transport([{}, gumletWorkspaceResponse]);
  await gumlet(fixture.fetcher).applyProtection(["courses.example.com"]);
  assert.deepEqual(JSON.parse(String(fixture.calls[0].init?.body)), { video_protection: { signed_url: true, whitelisted_referrers: ["courses.example.com"] } });
  assert.ok(!String(fixture.calls[0].init?.body).includes("signed_url_secret"));
  assert.ok(!String(fixture.calls[0].init?.body).includes("enable_download_button"));
});

test("Gumlet explicit remote hex and local Base64 key representations compare bytes", async () => {
  const remote = { ...gumletWorkspaceResponse, video_protection: { ...gumletWorkspaceResponse.video_protection, signed_url_secret: Buffer.from(PUBLIC_EXAMPLE_GUMLET_SECRET, "base64").toString("hex") } };
  const adapter = new GumletAdapter({ apiKey: "fixture-key", workspaceId: WORKSPACE_ID, signingSecret: PUBLIC_EXAMPLE_GUMLET_SECRET, secretEncoding: "base64", remoteSecretEncoding: "hex" }, transport([remote]).fetcher);
  assert.equal((await adapter.getProtection()).keyMatches, true);
});

test("Bunny get uses Stream AccessKey, real scope, and a secret-free DTO", async () => {
  const fixture = transport([bunnyVideoResponse]);
  const result = await bunny(fixture.fetcher).getAsset(VIDEO_ID);
  assert.equal(fixture.calls[0].url, `https://video.bunnycdn.com/library/${LIBRARY_ID}/videos/${VIDEO_ID}`);
  assert.equal((fixture.calls[0].init?.headers as Record<string, string>).AccessKey, "fixture-stream-key");
  assert.equal(result.ready, true);
  assert.ok(!JSON.stringify(result).includes("never-return"));
  await assert.rejects(() => bunny(transport([{ ...bunnyVideoResponse, videoLibraryId: 654321 }]).fetcher).getAsset(VIDEO_ID), /configured library/);
});

test("Bunny checks library and linked Pull Zone with distinct Core key and no secret DTO", async () => {
  const fixture = transport([bunnyLibraryResponse, bunnyZoneResponse]);
  const report = await bunny(fixture.fetcher).getProtection();
  assert.equal(fixture.calls[0].url, `https://api.bunny.net/videolibrary/${LIBRARY_ID}`);
  assert.equal(fixture.calls[1].url, "https://api.bunny.net/pullzone/42");
  assert.equal((fixture.calls[0].init?.headers as Record<string, string>).AccessKey, "fixture-core-key");
  assert.equal(report.cdnTokens, true);
  assert.equal(report.keyMatches, true);
  assert.ok(!JSON.stringify(report).includes("never-return"));
  assert.ok(!JSON.stringify(report).includes(TEST_BUNNY_KEY));
});

test("Bunny edge token bypass, missing referrers, originals, and host mismatch are detected", async () => {
  const fixture = transport([{ ...bunnyLibraryResponse, BlockNoneReferrer: false, ExposeOriginals: true, PlayerVersion: 1 }, { ...bunnyZoneResponse, EdgeRules: [{ Enabled: true, ActionType: 0, ExtraActions: [{ ActionType: 8 }] }] }]);
  const report = await bunny(fixture.fetcher).getProtection();
  assert.equal(report.cdnTokens, false);
  assert.equal(report.allowedDomains.length, 0);
  assert.equal(report.downloadsDisabled, false);
  assert.equal(report.playerHostMatches, false);
});

test("Bunny remote updates use documented fields and accept empty referrer success", async () => {
  const fixture = transport([{ ...bunnyLibraryResponse, AllowedReferrers: [] }, {}, new Response(null, { status: 200 }), {}, bunnyLibraryResponse, bunnyZoneResponse]);
  await bunny(fixture.fetcher).applyProtection(["courses.example.com"]);
  const update = JSON.parse(String(fixture.calls[1].init?.body));
  assert.deepEqual(update, { PlayerTokenAuthenticationEnabled: true, BlockNoneReferrer: true, AllowDirectPlay: false, EnableMP4Fallback: false, ExposeOriginals: false, AllowEarlyPlay: false });
  assert.equal(fixture.calls[2].url, `https://api.bunny.net/videolibrary/${LIBRARY_ID}/addAllowedReferrer`);
  assert.deepEqual(JSON.parse(String(fixture.calls[2].init?.body)), { Hostname: "courses.example.com" });
  assert.deepEqual(JSON.parse(String(fixture.calls[3].init?.body)), { ZoneSecurityEnabled: true });
  assert.equal("BlockDirectPlay" in update, false);
  assert.equal("ResetToken" in update, false);
});

test("Upstream failures and invalid JSON never reflect provider body secrets", async () => {
  for (const response of [new Response("never-return-error-secret", { status: 401 }), new Response("never-return-invalid-json", { status: 200 }), Response.json({ ApiKey: "never-return-shape-secret" })]) {
    await assert.rejects(() => gumlet(transport([response]).fetcher).getAsset(ASSET_ID), (error) => error instanceof Error && !error.message.includes("never-return"));
  }
});

test("Unknown Bunny rules or early-play state never produce a safe protection report", async () => {
  for (const unknown of [undefined, null]) {
    const fixture = transport([{ ...bunnyLibraryResponse, AllowEarlyPlay: unknown }, { ...bunnyZoneResponse, EdgeRules: unknown }]);
    const report = await bunny(fixture.fetcher).getProtection();
    assert.equal(report.cdnTokens, false);
    assert.equal(report.downloadsDisabled, false);
    assert.ok(report.warnings.some((warning) => warning.includes("not reported")));
  }
});

test("Missing provider signing keys are reported unknown, never silently matched", async () => {
  const gumletReport = await gumlet(transport([{ ...gumletWorkspaceResponse, video_protection: { ...gumletWorkspaceResponse.video_protection, signed_url_secret: undefined } }]).fetcher).getProtection();
  const bunnyReport = await bunny(transport([bunnyLibraryResponse, { ...bunnyZoneResponse, ZoneSecurityKey: null }]).fetcher).getProtection();
  assert.equal(gumletReport.keyMatches, null);
  assert.equal(bunnyReport.keyMatches, null);
});

test("Admin revocation guard stops additional Bunny remote mutations", async () => {
  const fixture = transport([{ ...bunnyLibraryResponse, AllowedReferrers: [] }, {}]);
  let authorizationChecks = 0;
  await assert.rejects(() => bunny(fixture.fetcher).applyProtection(["courses.example.com"], async () => {
    if (++authorizationChecks === 2) throw new Error("Administrator role was revoked.");
  }), /revoked/);
  assert.equal(fixture.calls.length, 2, "Library read and first authorized update only; no referrer/Pull Zone mutation after revocation.");
});

test("Both adapters reject a different same-scope asset than the requested ID", async () => {
  await assert.rejects(() => gumlet(transport([{ ...gumletAssetResponse, asset_id: "aaaaaaaaaaaaaaaaaaaaaaaa" }]).fetcher).getAsset(ASSET_ID), /different asset/);
  await assert.rejects(() => bunny(transport([{ ...bunnyVideoResponse, guid: "22222222-2222-4222-8222-222222222222" }]).fetcher).getAsset(VIDEO_ID), /different video/);
});
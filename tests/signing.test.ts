import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeGumletSecret, signBunnyEmbed, signGumletEmbed, tamperEmbedToken } from "../src/lib/server/providers/signing";
import { ASSET_ID, LIBRARY_ID, PUBLIC_EXAMPLE_GUMLET_SECRET, TEST_BUNNY_KEY, VIDEO_ID } from "./fixtures";

const expiry = 1795521900;

test("Gumlet matches a fixed vector derived from its published iframe example", () => {
  // Fixed expiry/digest generated from the published algorithm, not a vendor-published vector.
  const url = signGumletEmbed(ASSET_ID, PUBLIC_EXAMPLE_GUMLET_SECRET, expiry, [["watermark_text", "test"]]);
  assert.equal(url, `https://play.gumlet.io/embed/${ASSET_ID}?watermark_text=test&signed_token=ce54b9433b59908f20f6d9014b20e728a2f60ce7&signed_expires=${expiry}`);
  assert.ok(!url.includes(PUBLIC_EXAMPLE_GUMLET_SECRET));
});

test("Gumlet binds the serialized query and absolute second expiry", () => {
  const a = new URL(signGumletEmbed(ASSET_ID, PUBLIC_EXAMPLE_GUMLET_SECRET, expiry, [["watermark_text", "One & two"]]));
  const b = new URL(signGumletEmbed(ASSET_ID, PUBLIC_EXAMPLE_GUMLET_SECRET, expiry + 1, [["watermark_text", "One & two"]]));
  const c = new URL(signGumletEmbed(ASSET_ID, PUBLIC_EXAMPLE_GUMLET_SECRET, expiry, [["watermark_text", "different"]]));
  assert.equal(a.searchParams.get("watermark_text"), "One & two");
  assert.notEqual(a.searchParams.get("signed_token"), b.searchParams.get("signed_token"));
  assert.notEqual(a.searchParams.get("signed_token"), c.searchParams.get("signed_token"));
  assert.equal(a.searchParams.get("signed_expires"), String(expiry));
  assert.equal(a.searchParams.has("token"), false);
});

test("Gumlet explicit Base64 and hex representations sign the same bytes", () => {
  const hex = Buffer.from(PUBLIC_EXAMPLE_GUMLET_SECRET, "base64").toString("hex");
  assert.equal(signGumletEmbed(ASSET_ID, hex, expiry, [], "hex"), signGumletEmbed(ASSET_ID, PUBLIC_EXAMPLE_GUMLET_SECRET, expiry));
  assert.throws(() => decodeGumletSecret("short"));
  assert.throws(() => decodeGumletSecret("%%%%"));
  assert.throws(() => decodeGumletSecret("001122", "hex"));
});

test("Gumlet rejects duplicate signing fields and unsafe asset paths", () => {
  assert.throws(() => signGumletEmbed(ASSET_ID, PUBLIC_EXAMPLE_GUMLET_SECRET, expiry, [["signed_token", "override"]]));
  assert.throws(() => signGumletEmbed("../private", PUBLIC_EXAMPLE_GUMLET_SECRET, expiry));
  assert.throws(() => signGumletEmbed(ASSET_ID, PUBLIC_EXAMPLE_GUMLET_SECRET, expiry * 1000));
});

test("Bunny matches its documented concatenation SHA-256 vector", () => {
  const url = new URL(signBunnyEmbed(LIBRARY_ID, VIDEO_ID, TEST_BUNNY_KEY, expiry));
  assert.equal(url.origin, "https://player.mediadelivery.net");
  assert.equal(url.pathname, `/embed/${LIBRARY_ID}/${VIDEO_ID}`);
  assert.equal(url.searchParams.get("token"), "9a550516864ae3a806f8104295409ad56c66de0b4fb635e2b17f4639f8d41655");
  assert.equal(url.searchParams.get("expires"), String(expiry));
  assert.equal(url.searchParams.has("embedToken"), false);
  assert.ok(!url.toString().includes(TEST_BUNNY_KEY));
});

test("Bunny library ID is in the URL but not in the signature input", () => {
  const a = new URL(signBunnyEmbed(LIBRARY_ID, VIDEO_ID, TEST_BUNNY_KEY, expiry));
  const b = new URL(signBunnyEmbed("654321", VIDEO_ID, TEST_BUNNY_KEY, expiry));
  assert.equal(a.searchParams.get("token"), b.searchParams.get("token"));
  assert.notEqual(a.pathname, b.pathname);
});

test("Bunny legacy host is explicit and invalid keys/IDs/expiry fail", () => {
  assert.equal(new URL(signBunnyEmbed(LIBRARY_ID, VIDEO_ID, TEST_BUNNY_KEY, expiry, "iframe.mediadelivery.net")).host, "iframe.mediadelivery.net");
  assert.throws(() => signBunnyEmbed("0", VIDEO_ID, TEST_BUNNY_KEY, expiry));
  assert.throws(() => signBunnyEmbed(LIBRARY_ID, "not-a-guid", TEST_BUNNY_KEY, expiry));
  assert.throws(() => signBunnyEmbed(LIBRARY_ID, VIDEO_ID, "", expiry));
  assert.throws(() => signBunnyEmbed(LIBRARY_ID, VIDEO_ID, TEST_BUNNY_KEY, expiry * 1000));
});

test("Negative-test tampering changes only the existing signature", () => {
  for (const [provider, original] of [["GUMLET", signGumletEmbed(ASSET_ID, PUBLIC_EXAMPLE_GUMLET_SECRET, expiry)], ["BUNNY", signBunnyEmbed(LIBRARY_ID, VIDEO_ID, TEST_BUNNY_KEY, expiry)]] as const) {
    const tampered = new URL(tamperEmbedToken(original, provider));
    const normal = new URL(original);
    assert.equal(tampered.origin, normal.origin);
    assert.equal(tampered.pathname, normal.pathname);
    assert.equal(tampered.searchParams.get(provider === "GUMLET" ? "signed_expires" : "expires"), String(expiry));
    assert.notEqual(tampered.searchParams.get(provider === "GUMLET" ? "signed_token" : "token"), normal.searchParams.get(provider === "GUMLET" ? "signed_token" : "token"));
  }
});
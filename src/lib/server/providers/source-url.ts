import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import ipaddr from "ipaddr.js";
import { AppError } from "@/lib/errors";

type Resolver = (hostname: string, options: { all: true }) => Promise<LookupAddress[]>;

export async function validateImportUrl(raw: string, allowedHosts: string[], resolver: Resolver = lookup) {
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash || url.search) {
    throw new AppError("INVALID_SOURCE_URL", "Use a direct HTTPS media URL without credentials, query parameters, a custom port, or fragment.");
  }
  if (!allowedHosts.length || !allowedHosts.some((host) => host.trim().toLowerCase() === url.hostname.toLowerCase())) {
    throw new AppError("SOURCE_HOST_NOT_ALLOWED", "Approve the source hostname in VIDEO_IMPORT_ALLOWED_HOSTS on the server first.", 403);
  }
  let addresses: LookupAddress[];
  try { addresses = await resolver(url.hostname, { all: true }); } catch { throw new AppError("INVALID_SOURCE_URL", "The approved source hostname could not be resolved."); }
  if (!addresses.length || addresses.some((item) => ipaddr.process(item.address).range() !== "unicast")) {
    throw new AppError("INVALID_SOURCE_URL", "Private, loopback, link-local, and reserved media-source addresses are not allowed.", 403);
  }
  // Providers fetch the file themselves. Only approve trusted, static source hosts;
  // this DNS check cannot pin their DNS resolution or prevent their source redirects.
  return url.toString();
}
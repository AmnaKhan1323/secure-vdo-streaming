/** Public product identity only. This module must never contain credentials.
 * These domains describe the target product, not automatic auth/referrer grants.
 */
export const SITE = {
  name: "Secure VDO Streaming",
  shortName: "SVS",
  domain: "codewithharry.com",
  productionDomains: ["codewithharry.com", "www.codewithharry.com"],
  tagline: "Test secure course-video streaming.",
  prototypeLabel: "Secure streaming prototype",
} as const;


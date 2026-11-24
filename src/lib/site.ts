/** Public product identity only. This module must never contain credentials.
 * The target label is display text, never an auth origin or referrer grant.
 */
export const SITE = {
  name: "Secure VDO Streaming",
  shortName: "SVS",
  targetName: "vdo platform",
  tagline: "Test secure course-video streaming.",
  prototypeLabel: "Secure streaming prototype",
} as const;


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

// Legacy sample IDs remain stable: renaming the app must not relabel stored
// lessons, change enrollments/progress, or break existing video mappings.
export const FEATURED_COURSE_IDS = ["cwh-web-development", "cwh-python-essentials", "cwh-dsa-foundations"] as const;

export function featuredCourses<T extends { id: string }>(courses: T[], limit = 3): T[] {
  const rank = new Map<string, number>(FEATURED_COURSE_IDS.map((id, index) => [id, index]));
  return [...courses].sort((left, right) => (rank.get(left.id) ?? FEATURED_COURSE_IDS.length) - (rank.get(right.id) ?? FEATURED_COURSE_IDS.length)).slice(0, limit);
}
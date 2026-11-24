/** Text-only containers for an empty prototype database, not real curricula.
 * Stable legacy IDs preserve compatibility; seed never overwrites stored data.
 */
export const testCourses = [
  {
    id: "cwh-web-development", slug: "web-development-foundations", title: "Playback test course",
    subtitle: "Compare the same authorized video on both providers.",
    description: "A text-only streaming test container. Supply your own authorized media.",
    category: "Streaming test", level: "Test", accent: "violet", instructor: "Not assigned",
    instructorRole: "Prototype only", learningOutcomes: [] as string[], published: true, openEnrollment: true,
    lessons: [{ title: "Authorized test video", module: "Streaming test", description: "Link the same real video from Gumlet and Bunny Stream.", estimatedSeconds: 0 }],
  },
  {
    id: "cwh-python-essentials", slug: "python-programming-essentials", title: "Enrollment-denial test course",
    subtitle: "Check that non-enrolled viewers are denied playback.",
    description: "A text-only access-control test container. Self-enrollment is closed intentionally.",
    category: "Streaming test", level: "Test", accent: "blue", instructor: "Not assigned",
    instructorRole: "Prototype only", learningOutcomes: [] as string[], published: true, openEnrollment: false,
    lessons: [{ title: "Enrollment-denial test video", module: "Access test", description: "Use this lesson to verify missing enrollment is rejected.", estimatedSeconds: 0 }],
  },
];
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { sampleCourses } from "../src/lib/sample-curriculum";

export { sampleCourses } from "../src/lib/sample-curriculum";

export async function seed(prisma: PrismaClient) {
  // Insert missing curricula only. Never overwrite courses, provider mappings,
  // enrollments, progress, accounts, or earlier StreamLab sample identities.
  for (const sample of sampleCourses) {
    const { lessons, ...course } = sample;
    await prisma.course.upsert({ where: { id: course.id }, create: course, update: {} });
    for (const [position, lesson] of lessons.entries()) {
      await prisma.lesson.upsert({ where: { id: `${course.id}-lesson-${position + 1}` }, create: { id: `${course.id}-lesson-${position + 1}`, courseId: course.id, position: position + 1, ...lesson }, update: {} });
    }
  }
  for (const provider of ["GUMLET", "BUNNY"] as const) {
    await prisma.providerSetting.upsert({ where: { provider }, create: { provider, enabled: false, ttlSeconds: 300, allowedDomains: ["localhost"] }, update: {} });
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to seed PostgreSQL.");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 1 }) });
  try { await seed(prisma); console.log("Added any missing Secure VDO Streaming test containers (3 courses, 13 lessons). Existing content and learner data preserved; no accounts, passwords, or provider videos created."); }
  finally { await prisma.$disconnect(); }
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("prisma/seed.ts")) {
  main().catch(() => { console.error("Database seeding failed. Check connectivity and apply migrations first."); process.exitCode = 1; });
}
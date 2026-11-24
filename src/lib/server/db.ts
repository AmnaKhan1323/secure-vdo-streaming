import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { requiredEnv } from "./env";

const globalDb = globalThis as unknown as { streamlabDb?: PrismaClient };

export function db() {
  if (!globalDb.streamlabDb) {
    const adapter = new PrismaPg({
      connectionString: requiredEnv("DATABASE_URL"),
      max: process.env.STREAMLAB_LOCAL_DB === "true" ? 1 : 5,
      connectionTimeoutMillis: 5000,
    });
    globalDb.streamlabDb = new PrismaClient({ adapter, log: [] });
  }
  return globalDb.streamlabDb;
}
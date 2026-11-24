import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  // Generation/builds need no database. Runtime explicitly requires DATABASE_URL.
  datasource: { url: process.env.DATABASE_URL ?? "postgresql://127.0.0.1:5432/streamlab" },
});
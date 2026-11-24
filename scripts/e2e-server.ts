import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { startLocalDatabase } from "./local-db";
import { seed } from "../prisma/seed";
import { isolatedTestEnvironment } from "./e2e-environment";

async function main() {
  const local = await startLocalDatabase("memory://", 15438);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: local.url, max: 1 }) });
  try { await seed(prisma); } finally { await prisma.$disconnect(); }
  const secret = randomBytes(32).toString("base64");
  const env = isolatedTestEnvironment(process.env, local.url, secret);
  const child = spawn(process.execPath, [path.join(process.cwd(), "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", "3001"], { env, stdio: "inherit" });
  let closed = false;
  async function close() { if (closed) return; closed = true; child.kill(); await local.close(); }
  process.on("SIGINT", () => { void close().then(() => process.exit(0)); });
  process.on("SIGTERM", () => { void close().then(() => process.exit(0)); });
  child.on("exit", (code) => { void close().then(() => { process.exitCode = code ?? 0; }); });
}

main().catch(() => { console.error("Isolated E2E server failed to initialize."); process.exitCode = 1; });
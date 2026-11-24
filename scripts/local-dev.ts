import "dotenv/config";
import { config } from "dotenv";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seed } from "../prisma/seed";
import { startLocalDatabase } from "./local-db";

config({ path: ".env.local", quiet: true });

async function main() {
  if (process.env.DATABASE_URL) throw new Error("DATABASE_URL is already set. Use the normal dev/start commands with your configured PostgreSQL; the local launcher will not touch it.");
  const appPort = Number(process.env.PORT ?? 3000);
  const dbPort = Number(process.env.STREAMLAB_DB_PORT ?? 5433);
  if (![appPort, dbPort].every((port) => Number.isInteger(port) && port > 1024 && port < 65536)) throw new Error("Invalid local application/database port.");
  const localPath = path.join(process.cwd(), ".local");
  await mkdir(localPath, { recursive: true });
  const secretPath = path.join(localPath, "session-secret");
  let secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    try { secret = (await readFile(secretPath, "utf8")).trim(); }
    catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) throw error;
      secret = randomBytes(32).toString("base64");
      await writeFile(secretPath, secret, { flag: "wx", mode: 0o600 });
    }
  }
  if (secret.length < 32) throw new Error("Private local authentication secret must be at least 32 characters.");
  const appUrl = process.env.BETTER_AUTH_URL || `http://localhost:${appPort}`;
  if (![ `http://localhost:${appPort}`, `http://127.0.0.1:${appPort}` ].includes(appUrl)) throw new Error("The local launcher requires BETTER_AUTH_URL to match the loopback application port.");
  const database = await startLocalDatabase(path.join(localPath, "postgres"), dbPort);
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: database.url, max: 1 }) });
  try {
    // Bootstrap an empty database only. Restarting the prototype must not add
    // more curricula to an existing operator's course/video test workspace.
    if (await prisma.course.count() === 0) await seed(prisma);
  } finally { await prisma.$disconnect(); }
  console.log("[streamlab] Local PostgreSQL/WASM ready; existing courses and data preserved. Bound only to 127.0.0.1.");
  console.log("[streamlab] Private session secret loaded. No accounts or provider credentials generated.");
  const production = process.argv.includes("--production");
  const child = spawn(process.execPath, [path.join(process.cwd(), "node_modules/next/dist/bin/next"), production ? "start" : "dev", "--hostname", "127.0.0.1", "--port", String(appPort)], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: database.url, BETTER_AUTH_SECRET: secret, BETTER_AUTH_URL: appUrl, STREAMLAB_LOCAL_DB: "true", NODE_USE_SYSTEM_CA: "1" },
  });
  let stopped = false;
  async function stop() {
    if (stopped) return;
    stopped = true;
    child.kill();
    await database.close();
  }
  process.on("SIGINT", () => { void stop().then(() => process.exit(0)); });
  process.on("SIGTERM", () => { void stop().then(() => process.exit(0)); });
  child.on("error", () => { console.error("[streamlab] Application process could not start."); void stop().then(() => { process.exitCode = 1; }); });
  child.on("exit", (code) => { void stop().then(() => { process.exitCode = code ?? 0; }); });
}

main().catch((error) => {
  // Local setup errors never print connection URLs or secret values.
  console.error("[streamlab] Local startup failed:", error instanceof Error && !error.message.includes("postgresql:") ? error.message : "Check the local database and server configuration.");
  process.exitCode = 1;
});
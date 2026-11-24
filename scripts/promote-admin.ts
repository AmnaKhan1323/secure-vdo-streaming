import "dotenv/config";
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local", quiet: true });

async function main() {
  const emailIndex = process.argv.indexOf("--email");
  const email = process.argv[emailIndex + 1]?.trim().toLowerCase();
  if (emailIndex < 0 || !email || !email.includes("@")) throw new Error("Provide --email for an existing signed-up account.");
  const local = process.argv.includes("--local");
  const url = local ? `postgresql://postgres@127.0.0.1:${Number(process.env.STREAMLAB_DB_PORT ?? 5433)}/postgres?sslmode=disable` : process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL or use --local while the local database launcher is running.");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 1, connectionTimeoutMillis: 5000 }) });
  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) throw new Error("No matching account. Sign up first. This command never creates accounts or passwords.");
    await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
    console.log("Administrator role granted to the existing account. Refresh the workspace. Playback still requires course enrollment.");
  } finally { await prisma.$disconnect(); }
}

main().catch(() => { console.error("Admin promotion failed. Check the email, database connection, and whether the account already exists."); process.exitCode = 1; });
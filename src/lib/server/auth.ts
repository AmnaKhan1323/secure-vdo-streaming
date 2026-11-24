import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { AppError } from "@/lib/errors";
import { appOrigin, requiredEnv } from "./env";
import { db } from "./db";
import { SITE } from "@/lib/site";

function createAuth() {
  const secret = requiredEnv("BETTER_AUTH_SECRET");
  if (secret.length < 32) throw new AppError("CONFIGURATION_REQUIRED", "BETTER_AUTH_SECRET must have at least 32 characters of cryptographically random data.", 503);
  const origin = appOrigin();
  return betterAuth({
    appName: SITE.name,
    baseURL: origin,
    secret,
    database: prismaAdapter(db(), { provider: "postgresql", transaction: true }),
    trustedOrigins: [origin],
    emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength: 128 },
    user: { additionalFields: { role: { type: "string", defaultValue: "STUDENT", input: false } } },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, window: 60, max: 30, storage: "database" },
    advanced: { defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: origin.startsWith("https:") } },
  });
}

let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() { return instance ??= createAuth(); }
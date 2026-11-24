import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { AppError } from "@/lib/errors";
import type { VideoProvider } from "@/lib/types";
import type { AuthIdentity } from "./access-types";
import { assertSessionActive, lockIdentity } from "./commit-access";

// A provider operation makes at most 22 bounded (15s) upstream requests. A
// crashed operation stays disabled; takeover is allowed only after 10 minutes.
// This cannot undo provider-side work already in flight or external console edits.
const OPERATION_LIFETIME_MS = 10 * 60 * 1000;
export type ProviderOperation = { id: string; requiresVerification: boolean };

export async function beginProviderOperation(client: PrismaClient, identity: AuthIdentity, provider: VideoProvider, expectedRevision?: number): Promise<ProviderOperation> {
  return client.$transaction(async (transaction) => {
    const sessionExpiry = await lockIdentity(transaction, identity, true);
    await transaction.providerSetting.upsert({ where: { provider }, create: { provider }, update: {} });
    await transaction.$queryRaw(Prisma.sql`SELECT "provider" FROM "ProviderSetting" WHERE "provider" = ${provider}::"Provider" FOR UPDATE`);
    const current = await transaction.providerSetting.findUniqueOrThrow({ where: { provider } });
    if (expectedRevision !== undefined && current.revision !== expectedRevision) throw new AppError("PROVIDER_CONFIGURATION_CHANGED", "Saved policy changed. Reload the current settings before saving.", 409);
    if (current.configurationState === "updating" && current.operationStartedAt && Date.now() - current.operationStartedAt.getTime() < OPERATION_LIFETIME_MS) {
      throw new AppError("PROVIDER_CONFIGURATION_BUSY", "Another provider update is running. Wait for it to finish; stale operations can be recovered after 10 minutes.", 409);
    }
    const id = randomUUID();
    await transaction.providerSetting.update({ where: { provider }, data: { enabled: false, revision: { increment: 1 }, configurationState: "updating", operationId: id, operationStartedAt: new Date() } });
    assertSessionActive(sessionExpiry);
    return { id, requiresVerification: current.configurationState !== "ready" };
  });
}

function assertOperation(current: { configurationState: string; operationId: string | null; operationStartedAt: Date | null }, operation: ProviderOperation) {
  if (current.configurationState !== "updating" || current.operationId !== operation.id || !current.operationStartedAt || Date.now() - current.operationStartedAt.getTime() >= OPERATION_LIFETIME_MS) {
    throw new AppError("PROVIDER_CONFIGURATION_CHANGED", "This update is stale or was replaced. Playback stays blocked until a fresh provider configuration is verified.", 409);
  }
}

export async function assertProviderOperation(client: PrismaClient, provider: VideoProvider, operation: ProviderOperation) {
  const current = await client.providerSetting.findUniqueOrThrow({ where: { provider } });
  assertOperation(current, operation);
}

export async function finishProviderOperation(client: PrismaClient, identity: AuthIdentity, provider: VideoProvider, operation: ProviderOperation, input: { enabled: boolean; ttlSeconds: number; allowedDomains: string[] }) {
  return client.$transaction(async (transaction) => {
    const sessionExpiry = await lockIdentity(transaction, identity, true);
    await transaction.$queryRaw(Prisma.sql`SELECT "provider" FROM "ProviderSetting" WHERE "provider" = ${provider}::"Provider" FOR UPDATE`);
    const current = await transaction.providerSetting.findUniqueOrThrow({ where: { provider } });
    assertOperation(current, operation);
    const setting = await transaction.providerSetting.update({ where: { provider }, data: { ...input, revision: { increment: 1 }, configurationState: "ready", operationId: null, operationStartedAt: null } });
    assertSessionActive(sessionExpiry);
    return setting;
  });
}

export async function failProviderOperation(client: PrismaClient, provider: VideoProvider, operation: ProviderOperation) {
  // Owner-scoped compare-and-set cannot disable a newer successful operation.
  await client.providerSetting.updateMany({ where: { provider, operationId: operation.id, configurationState: "updating" }, data: { enabled: false, revision: { increment: 1 }, configurationState: "failed", operationId: null, operationStartedAt: null } });
}
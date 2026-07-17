import type { SyncStatus } from "@nusafood/database";
import { prisma } from "@/lib/db";

export type DualWritePrimary = "gas" | "db";

export function dualWriteEnabled(): boolean {
  return process.env.DUAL_WRITE_ENABLED === "true";
}

export function dualWritePrimary(): DualWritePrimary {
  return process.env.DUAL_WRITE_PRIMARY === "db" ? "db" : "gas";
}

export async function logSyncOperation(input: {
  operation: string;
  entityType: string;
  entityId?: string | null;
  v1Status?: SyncStatus | null;
  v2Status?: SyncStatus | null;
  v1Response?: unknown;
  v2Response?: unknown;
  errorMessage?: string | null;
}) {
  return prisma.syncLog.create({
    data: {
      operation: input.operation,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      v1Status: input.v1Status ?? null,
      v2Status: input.v2Status ?? null,
      v1Response: input.v1Response
        ? (input.v1Response as object)
        : undefined,
      v2Response: input.v2Response
        ? (input.v2Response as object)
        : undefined,
      errorMessage: input.errorMessage ?? null,
    },
  });
}

export async function writeAuditLog(input: {
  entityType: string;
  entityId: string;
  action: string;
  actorType: string;
  actorId?: string;
  actorName?: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
}) {
  return prisma.auditLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      actorType: input.actorType,
      actorId: input.actorId,
      actorName: input.actorName,
      oldValue: input.oldValue ? (input.oldValue as object) : undefined,
      newValue: input.newValue ? (input.newValue as object) : undefined,
      metadata: input.metadata ? (input.metadata as object) : undefined,
    },
  });
}

import { prisma } from "@/lib/db";
import {
  syncPayloadToDb,
  type SyncPayload,
  type SyncResult,
} from "@nusafood/database/sync";

export async function listSyncLogs(limit = 50) {
  return prisma.syncLog.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 200),
  });
}

export async function runSyncPayload(
  payload: SyncPayload,
  source = "api:payload",
): Promise<SyncResult> {
  return syncPayloadToDb(prisma, payload, { source });
}

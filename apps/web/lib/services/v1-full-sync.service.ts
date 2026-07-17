import type { V1FullSyncResult } from "@nusafood/database/v1-full-sync";
import {
  loadChecklistPayloadFromGas,
  loadOperationalPayloadFromGas,
  syncAllFromV1Payloads,
} from "@nusafood/database/v1-full-sync";
import { prisma } from "@/lib/db";
import { callGasAction } from "@/lib/services/gas-adapter.service";

export class V1FullSyncError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function gasCaller(action: string, params?: Record<string, string>) {
  const result = await callGasAction<unknown>(action, params, "GET");
  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

/** One-shot sync from v1 GAS → PostgreSQL (master + tasks + recurring/checklist). */
export async function syncAllFromV1Gas(): Promise<V1FullSyncResult> {
  if (!process.env.GAS_WEB_APP_URL || process.env.GAS_WEB_APP_URL.includes("...")) {
    throw new V1FullSyncError(
      "GAS_WEB_APP_URL belum dikonfigurasi di environment",
      "GAS_NOT_CONFIGURED",
      503,
    );
  }

  const [operational, checklist] = await Promise.all([
    loadOperationalPayloadFromGas(gasCaller),
    loadChecklistPayloadFromGas(gasCaller),
  ]);

  return syncAllFromV1Payloads(
    prisma,
    operational,
    checklist,
    "gas:full-sync",
  );
}

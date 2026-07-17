import type { SyncResult } from "@nusafood/database/sync";
import { callGasAction } from "@/lib/services/gas-adapter.service";
import { runSyncPayload } from "@/lib/services/sync.service";

export class MasterDataSyncError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function syncMasterDataFromGas(): Promise<SyncResult> {
  const [staffRes, areasRes, categoriesRes] = await Promise.all([
    callGasAction<unknown>("getStaff", undefined, "GET"),
    callGasAction<unknown>("getAreas", undefined, "GET"),
    callGasAction<unknown>("getCategories", undefined, "GET"),
  ]);

  if (!staffRes.success) {
    throw new MasterDataSyncError(
      staffRes.error || "Gagal mengambil staff dari v1",
      "GAS_STAFF_FAILED",
      502,
    );
  }
  if (!areasRes.success) {
    throw new MasterDataSyncError(
      areasRes.error || "Gagal mengambil area dari v1",
      "GAS_AREAS_FAILED",
      502,
    );
  }
  if (!categoriesRes.success) {
    throw new MasterDataSyncError(
      categoriesRes.error || "Gagal mengambil kategori dari v1",
      "GAS_CATEGORIES_FAILED",
      502,
    );
  }

  return runSyncPayload(
    {
      staff: staffRes.data,
      areas: areasRes.data,
      categories: categoriesRes.data,
    },
    "gas:master-data",
  );
}

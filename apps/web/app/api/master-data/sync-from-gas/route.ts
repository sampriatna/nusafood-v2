import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  MasterDataSyncError,
  syncMasterDataFromGas,
} from "@/lib/services/master-data-sync.service";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const result = await syncMasterDataFromGas();
    return ok(result);
  } catch (error) {
    if (error instanceof MasterDataSyncError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/master-data/sync-from-gas]", error);
    return fail(
      error instanceof Error ? error.message : "Sync master data gagal",
      { code: "MASTER_DATA_SYNC_FAILED", status: 500 },
    );
  }
}

import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  V1FullSyncError,
  syncAllFromV1Gas,
} from "@/lib/services/v1-full-sync.service";

export const dynamic = "force-dynamic";

/** Legacy alias — redirects to full v1 sync. */
export async function POST() {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const result = await syncAllFromV1Gas();
    return ok(result);
  } catch (error) {
    if (error instanceof V1FullSyncError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/master-data/sync-from-gas]", error);
    return fail(
      error instanceof Error ? error.message : "Sync master data gagal",
      { code: "MASTER_DATA_SYNC_FAILED", status: 500 },
    );
  }
}

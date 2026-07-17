import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  V1FullSyncError,
  syncAllFromV1Gas,
} from "@/lib/services/v1-full-sync.service";

export const dynamic = "force-dynamic";

/** Sync semua data operasional v1 → PostgreSQL v2 (master, tasks, recurring, checklist). */
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
    console.error("[POST /api/sync/from-v1]", error);
    return fail(
      error instanceof Error ? error.message : "Sync v1 gagal",
      { code: "V1_FULL_SYNC_FAILED", status: 500 },
    );
  }
}

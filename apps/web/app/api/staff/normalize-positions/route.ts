import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  StaffWriteError,
  normalizeAllStaffPositions,
} from "@/lib/services/staff.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin: normalisasi jabatan semua staff ke posisi standar. */
export async function POST() {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const result = await normalizeAllStaffPositions();
    return ok(result);
  } catch (error) {
    if (error instanceof StaffWriteError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/staff/normalize-positions]", error);
    return fail(
      error instanceof Error ? error.message : "Normalisasi jabatan gagal",
      { code: "STAFF_POSITION_NORMALIZE_FAILED", status: 500 },
    );
  }
}

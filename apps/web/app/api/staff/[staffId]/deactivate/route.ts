import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  StaffWriteError,
  setStaffStatus,
} from "@/lib/services/staff.service";

export const dynamic = "force-dynamic";

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ staffId: string }> },
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const { staffId } = await context.params;
    const staff = await setStaffStatus(staffId, "INACTIVE");
    return ok(staff);
  } catch (error) {
    if (error instanceof StaffWriteError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[PATCH /api/staff/:id/deactivate]", error);
    return fail("Gagal menonaktifkan staff", {
      code: "STAFF_DEACTIVATE_FAILED",
      status: 500,
    });
  }
}

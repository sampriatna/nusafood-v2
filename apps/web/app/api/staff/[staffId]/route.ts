import type { UpdateStaffPayload } from "@nusafood/types";
import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  OutletAccessError,
  assertStaffOutletAccess,
} from "@/lib/outlet-scope";
import {
  StaffWriteError,
  getStaffById,
  updateStaff,
} from "@/lib/services/staff.service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ staffId: string }> },
) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  const { staffId } = await context.params;
  try {
    await assertStaffOutletAccess(auth.session!, staffId);
    const staff = await getStaffById(staffId);
    if (!staff) {
      return fail("Staff tidak ditemukan", { code: "NOT_FOUND", status: 404 });
    }
    return ok(staff);
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    throw error;
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ staffId: string }> },
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const { staffId } = await context.params;
    const body = (await request.json()) as UpdateStaffPayload;
    const staff = await updateStaff(staffId, { ...body, staff_id: staffId });
    return ok(staff);
  } catch (error) {
    if (error instanceof StaffWriteError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[PUT /api/staff/:id]", error);
    return fail("Gagal update staff", {
      code: "STAFF_UPDATE_FAILED",
      status: 500,
    });
  }
}

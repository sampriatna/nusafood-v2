import type { CreateStaffPayload } from "@nusafood/types";
import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  StaffWriteError,
  createStaff,
  listStaff,
} from "@/lib/services/staff.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const data = await listStaff({
      outlet: searchParams.get("outlet") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });
    return ok(data, { total: data.length });
  } catch (error) {
    console.error("[GET /api/staff]", error);
    return fail("Gagal mengambil data staff", {
      code: "STAFF_LIST_FAILED",
      status: 500,
    });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as CreateStaffPayload;
    const staff = await createStaff(body);
    return ok(staff, undefined, { status: 201 });
  } catch (error) {
    if (error instanceof StaffWriteError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/staff]", error);
    return fail("Gagal membuat staff", {
      code: "STAFF_CREATE_FAILED",
      status: 500,
    });
  }
}

import { fail, ok } from "@/lib/api/response";
import { listStaff } from "@/lib/services/staff.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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

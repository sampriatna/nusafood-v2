import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  OutletAccessError,
  resolveListOutletFilter,
} from "@/lib/outlet-scope";
import { listChecklistReports } from "@/lib/services/checklist.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const outlet = resolveListOutletFilter(
      auth.session!,
      searchParams.get("outlet"),
    );
    const data = await listChecklistReports({
      outlet,
      status: searchParams.get("status") ?? undefined,
    });
    return ok(data, { total: data.length });
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[GET /api/checklist-reports]", error);
    return fail("Gagal mengambil laporan checklist", { status: 500 });
  }
}

import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  OutletAccessError,
  assertTaskOutletAccess,
} from "@/lib/outlet-scope";
import { getChecklistReportByTaskId } from "@/lib/services/checklist.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ taskId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { taskId } = await params;
    await assertTaskOutletAccess(auth.session!, taskId);
    const data = await getChecklistReportByTaskId(taskId);
    if (!data) {
      return fail("Checklist tidak ditemukan", {
        code: "NOT_FOUND",
        status: 404,
      });
    }
    return ok(data);
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[GET /api/checklist-reports/:taskId]", error);
    return fail("Gagal mengambil checklist", { status: 500 });
  }
}

import { fail, ok } from "@/lib/api/response";
import { getChecklistReportByTaskId } from "@/lib/services/checklist.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ taskId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { taskId } = await params;
    const data = await getChecklistReportByTaskId(taskId);
    if (!data) {
      return fail("Checklist tidak ditemukan", {
        code: "NOT_FOUND",
        status: 404,
      });
    }
    return ok(data);
  } catch (error) {
    console.error("[GET /api/checklist-reports/:taskId]", error);
    return fail("Gagal mengambil checklist", { status: 500 });
  }
}

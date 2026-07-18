import { fail, ok } from "@/lib/api/response";
import { getTaskById } from "@/lib/services/task.service";
import { requireAuth } from "@/lib/require-auth";
import {
  OutletAccessError,
  assertTaskOutletAccess,
} from "@/lib/outlet-scope";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ taskId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { taskId } = await params;
    await assertTaskOutletAccess(auth.session!, taskId);
    const task = await getTaskById(taskId);
    if (!task) {
      return fail("Tugas tidak ditemukan", {
        code: "TASK_NOT_FOUND",
        status: 404,
      });
    }
    return ok(task);
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[GET /api/tasks/:taskId]", error);
    return fail("Gagal mengambil detail tugas", {
      code: "TASK_DETAIL_FAILED",
      status: 500,
    });
  }
}

import { fail, ok } from "@/lib/api/response";
import { getTaskById } from "@/lib/services/task.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ taskId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { taskId } = await params;
    const task = await getTaskById(taskId);
    if (!task) {
      return fail("Tugas tidak ditemukan", {
        code: "TASK_NOT_FOUND",
        status: 404,
      });
    }
    return ok(task);
  } catch (error) {
    console.error("[GET /api/tasks/:taskId]", error);
    return fail("Gagal mengambil detail tugas", {
      code: "TASK_DETAIL_FAILED",
      status: 500,
    });
  }
}

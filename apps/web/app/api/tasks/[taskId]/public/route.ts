import { fail, ok } from "@/lib/api/response";
import { getTaskByToken } from "@/lib/services/task.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ taskId: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { taskId } = await params;
    const token = new URL(request.url).searchParams.get("token");

    if (!token) {
      return fail("Token tidak valid", {
        code: "INVALID_TOKEN",
        status: 403,
      });
    }

    const task = await getTaskByToken(taskId, token);
    if (!task) {
      return fail("Tugas tidak ditemukan", {
        code: "TASK_NOT_FOUND",
        status: 404,
      });
    }

    return ok(task);
  } catch (error) {
    console.error("[GET /api/tasks/:taskId/public]", error);
    return fail("Gagal mengambil tugas publik", {
      code: "TASK_PUBLIC_FAILED",
      status: 500,
    });
  }
}

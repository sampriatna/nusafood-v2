import { fail, ok } from "@/lib/api/response";
import {
  TaskWriteError,
  markTaskOpened,
} from "@/lib/services/task-write.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ taskId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { taskId } = await params;
    const body = (await request.json()) as { token?: string };
    if (!body.token) {
      return fail("Token tidak valid", { code: "INVALID_TOKEN", status: 403 });
    }
    const task = await markTaskOpened(taskId, body.token);
    return ok(task);
  } catch (error) {
    if (error instanceof TaskWriteError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/tasks/:id/open]", error);
    return fail("Gagal menandai tugas dibuka", {
      code: "TASK_OPEN_FAILED",
      status: 500,
    });
  }
}

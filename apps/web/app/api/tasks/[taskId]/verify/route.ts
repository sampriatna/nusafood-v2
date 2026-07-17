import { fail, ok } from "@/lib/api/response";
import {
  TaskWriteError,
  verifyTask,
} from "@/lib/services/task-write.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ taskId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { taskId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      note?: string;
      verified_by?: string;
    };
    const task = await verifyTask(taskId, body.note, body.verified_by);
    return ok(task);
  } catch (error) {
    if (error instanceof TaskWriteError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/tasks/:id/verify]", error);
    return fail("Gagal verifikasi tugas", {
      code: "TASK_VERIFY_FAILED",
      status: 500,
    });
  }
}

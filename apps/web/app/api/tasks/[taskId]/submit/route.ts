import { fail, ok } from "@/lib/api/response";
import {
  TaskWriteError,
  submitTaskReport,
} from "@/lib/services/task-write.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ taskId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { taskId } = await params;
    const body = (await request.json()) as {
      token?: string;
      after_photo_url?: string;
      staff_note?: string;
    };

    if (!body.token) {
      return fail("Token tidak valid", { code: "INVALID_TOKEN", status: 403 });
    }

    const task = await submitTaskReport({
      taskId,
      token: body.token,
      afterPhotoUrl: body.after_photo_url,
      staffNote: body.staff_note,
    });

    return ok(task);
  } catch (error) {
    if (error instanceof TaskWriteError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/tasks/:id/submit]", error);
    return fail("Gagal mengirim laporan", {
      code: "TASK_SUBMIT_FAILED",
      status: 500,
    });
  }
}

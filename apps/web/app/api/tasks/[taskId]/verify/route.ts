import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  OutletAccessError,
  assertTaskOutletAccess,
} from "@/lib/outlet-scope";
import {
  TaskWriteError,
  verifyTask,
} from "@/lib/services/task-write.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ taskId: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { taskId } = await params;
    await assertTaskOutletAccess(auth.session!, taskId);
    const body = (await request.json().catch(() => ({}))) as {
      note?: string;
      verified_by?: string;
    };
    const task = await verifyTask(taskId, body.note, body.verified_by);
    return ok(task);
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
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

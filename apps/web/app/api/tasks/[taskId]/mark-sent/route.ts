import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  OutletAccessError,
  assertTaskOutletAccess,
} from "@/lib/outlet-scope";
import { markTaskSent } from "@/lib/services/pending-send.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ taskId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { taskId } = await params;
    if (auth.session) await assertTaskOutletAccess(auth.session, taskId);
    const task = await markTaskSent(taskId);
    if (!task) {
      return fail("Tugas tidak ditemukan", { code: "TASK_NOT_FOUND", status: 404 });
    }
    return ok(task);
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/tasks/:id/mark-sent]", error);
    return fail("Gagal menandai terkirim", { code: "MARK_SENT_FAILED", status: 500 });
  }
}

import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  OutletAccessError,
  assertTaskOutletAccess,
} from "@/lib/outlet-scope";
import {
  TaskWriteError,
  resendWhatsApp,
} from "@/lib/services/task-write.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ taskId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { taskId } = await params;
    await assertTaskOutletAccess(auth.session!, taskId);
    await resendWhatsApp(taskId);
    return ok({ task_id: taskId, resent: true });
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    if (error instanceof TaskWriteError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/tasks/:id/resend-wa]", error);
    return fail("Gagal kirim ulang WhatsApp", {
      code: "RESEND_WA_FAILED",
      status: 500,
    });
  }
}

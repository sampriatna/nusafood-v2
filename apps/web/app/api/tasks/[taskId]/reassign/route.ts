import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  OutletAccessError,
  assertTaskOutletAccess,
} from "@/lib/outlet-scope";
import { reassignTaskPic } from "@/lib/services/pending-send.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ taskId: string }> };

/** Ganti PIC tugas sebelum dikirim → balas link WA baru. */
export async function POST(request: Request, { params }: Params) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { taskId } = await params;
    if (auth.session) await assertTaskOutletAccess(auth.session, taskId);
    const body = (await request.json().catch(() => ({}))) as { staff_id?: string };
    if (!body.staff_id) {
      return fail("Pilih staff dulu", { code: "STAFF_REQUIRED" });
    }
    const task = await reassignTaskPic(taskId, body.staff_id);
    if (!task) {
      return fail("Tugas tidak ditemukan", { code: "TASK_NOT_FOUND", status: 404 });
    }
    return ok(task);
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    if (error instanceof Error && error.message.includes("Staff tidak ditemukan")) {
      return fail(error.message, { code: "STAFF_INVALID", status: 422 });
    }
    console.error("[POST /api/tasks/:id/reassign]", error);
    return fail("Gagal mengganti PIC", { code: "REASSIGN_FAILED", status: 500 });
  }
}

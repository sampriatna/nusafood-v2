import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  OutletAccessError,
  assertTaskOutletAccess,
} from "@/lib/outlet-scope";
import { resendChecklistWhatsApp } from "@/lib/gas-whatsapp.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ taskId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { taskId } = await params;
    await assertTaskOutletAccess(auth.session!, taskId);
    const result = await resendChecklistWhatsApp(taskId);
    return ok({
      task_id: taskId,
      auto_sent: result.auto_sent,
      wa_link: result.wa_link,
      error: result.error,
      resent: result.auto_sent,
    });
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/checklist-reports/:id/resend-wa]", error);
    return fail(
      error instanceof Error ? error.message : "Gagal kirim ulang WA checklist",
      { code: "RESEND_CHECKLIST_WA_FAILED", status: 502 },
    );
  }
}

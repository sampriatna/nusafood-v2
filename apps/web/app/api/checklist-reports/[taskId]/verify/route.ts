import { fail, ok } from "@/lib/api/response";
import {
  ChecklistError,
  verifyChecklistReport,
} from "@/lib/services/checklist.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ taskId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { taskId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      note?: string;
      verified_by?: string;
    };
    const data = await verifyChecklistReport(
      taskId,
      body.note,
      body.verified_by,
    );
    return ok(data);
  } catch (error) {
    if (error instanceof ChecklistError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/checklist-reports/:id/verify]", error);
    return fail("Gagal verifikasi checklist", { status: 500 });
  }
}

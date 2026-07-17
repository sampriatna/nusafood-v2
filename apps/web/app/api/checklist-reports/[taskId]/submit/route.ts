import { fail, ok } from "@/lib/api/response";
import {
  ChecklistError,
  submitChecklistReport,
} from "@/lib/services/checklist.service";
import type { ChecklistReportItem } from "@nusafood/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ taskId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { taskId } = await params;
    const body = (await request.json()) as {
      token?: string;
      checked_items?: ChecklistReportItem[];
      staff_note?: string;
      after_photo_url?: string;
    };
    if (!body.token) {
      return fail("Token tidak valid", { code: "INVALID_TOKEN", status: 403 });
    }
    const data = await submitChecklistReport({
      taskId,
      token: body.token,
      checked_items: body.checked_items ?? [],
      staff_note: body.staff_note,
      after_photo_url: body.after_photo_url,
    });
    return ok(data);
  } catch (error) {
    if (error instanceof ChecklistError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/checklist-reports/:id/submit]", error);
    return fail("Gagal mengirim checklist", { status: 500 });
  }
}

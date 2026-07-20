import type { ReportConditionStatus } from "@nusafood/types";
import { fail, ok } from "@/lib/api/response";
import {
  DailyActivityError,
  submitDailyReport,
} from "@/lib/services/daily-activity.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body.token || "");
    const reportTemplateId = String(body.report_template_id || "");
    const note = typeof body.note === "string" ? body.note : "";
    const photoUrl =
      typeof body.photo_url === "string"
        ? body.photo_url
        : typeof body.photo_base64 === "string"
          ? body.photo_base64
          : null;
    const statusCondition = body.status_condition as ReportConditionStatus;
    const checklistAnswers = Array.isArray(body.checklist_answers)
      ? body.checklist_answers.map(
          (a: { checklist_item_id?: string; checked?: boolean }) => ({
            checklist_item_id: String(a.checklist_item_id || ""),
            checked: Boolean(a.checked),
          }),
        )
      : [];

    if (!token || !reportTemplateId) {
      return fail("Token dan kegiatan wajib diisi", {
        code: "VALIDATION_ERROR",
        status: 400,
      });
    }
    if (!statusCondition) {
      return fail("Pilih status kondisi kegiatan", {
        code: "VALIDATION_ERROR",
        status: 400,
      });
    }

    const submission = await submitDailyReport({
      token,
      report_template_id: reportTemplateId,
      status_condition: statusCondition,
      note,
      photo_url: photoUrl,
      checklist_answers: checklistAnswers,
    });

    return ok(submission);
  } catch (error) {
    if (error instanceof DailyActivityError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/staff-reports/submit]", error);
    return fail("Gagal submit kegiatan", {
      code: "DAILY_REPORT_SUBMIT_FAILED",
      status: 500,
    });
  }
}

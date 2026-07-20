import type { ReportConditionStatus } from "@nusafood/types";
import { submitDailyReport } from "@/lib/staff-report-store";
import { notifyLeadersOnKendala } from "@/lib/wa-notify-daily-report";
import { ensureStaffReportCache } from "@/lib/ensure-staff-report-cache";
import { fail } from "@/lib/api/response";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Public submit — if kendala → notify leaders (GAS + wa.me fallback). */
export async function POST(request: Request) {
  await ensureStaffReportCache();

  try {
    const body = await request.json();
    const token = String(body.token || "");
    const reportTemplateId = String(body.report_template_id || "");
    const note = typeof body.note === "string" ? body.note : "";
    const photoBase64 =
      typeof body.photo_base64 === "string" ? body.photo_base64 : undefined;
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
      return fail("Token dan kegiatan wajib diisi", { status: 400 });
    }

    if (!statusCondition) {
      return fail("Pilih status kondisi kegiatan", { status: 400 });
    }

    const result = submitDailyReport({
      token,
      report_template_id: reportTemplateId,
      status_condition: statusCondition,
      note,
      photo_url: photoBase64 || null,
      checklist_answers: checklistAnswers,
    });

    if (!result.success) {
      return fail(result.error, { status: 400 });
    }

    const submission = result.data;
    let notify = null;

    if (statusCondition !== "aman") {
      notify = await notifyLeadersOnKendala({
        staff_name: submission.staff_name || "Staff",
        staff_id: submission.staff_id,
        outlet: submission.outlet || submission.outlet_id,
        position: submission.position || "",
        activity_title: submission.report_title || "Kegiatan",
        status_condition: statusCondition,
        note: submission.note || "",
        checklist_summary:
          submission.checklist_total != null
            ? `${submission.checklist_checked}/${submission.checklist_total}`
            : undefined,
        report_date: submission.report_date,
        submission_id: submission.id,
      });
    }

    return NextResponse.json({
      success: true,
      data: submission,
      error: null,
      notify,
    });
  } catch {
    return fail("Invalid request body", { status: 400 });
  }
}

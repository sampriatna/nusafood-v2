import type { ReportConditionStatus } from "@nusafood/types";
import { NextResponse } from "next/server";
import { fail } from "@/lib/api/response";
import {
  DailyActivityError,
  submitDailyReport,
} from "@/lib/services/daily-activity.service";
import { notifyLeadersOnKendala } from "@/lib/wa-notify-daily-report";

export const dynamic = "force-dynamic";

/** Public submit — if kendala → notify leaders (GAS + wa.me fallback). */
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
  } catch (error) {
    if (error instanceof DailyActivityError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/staff-reports/submit]", error);
    const message =
      error instanceof Error ? error.message : String(error ?? "");
    const looksLikeMissingSchema =
      /does not exist|P2021|P2022|relation .* does not exist|column .* does not exist/i.test(
        message,
      );
    const looksLikeTxPool =
      /P2028|Transaction not found|Unable to start a transaction|transaction.*timeout|prepared statement/i.test(
        message,
      );
    return fail(
      looksLikeMissingSchema
        ? "Gagal submit kegiatan — jalankan migrasi DB (pnpm db:migrate:deploy)"
        : looksLikeTxPool
          ? "Gagal submit kegiatan — koneksi database pooler. Coba lagi sebentar."
          : "Gagal submit kegiatan",
      {
        code: looksLikeMissingSchema
          ? "DAILY_REPORT_SCHEMA_MISSING"
          : looksLikeTxPool
            ? "DAILY_REPORT_TX_FAILED"
            : "DAILY_REPORT_SUBMIT_FAILED",
        status: 500,
      },
    );
  }
}

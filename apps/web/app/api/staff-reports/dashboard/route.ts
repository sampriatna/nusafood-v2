import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  DailyActivityError,
  buildDailyReportDashboard,
} from "@/lib/services/daily-activity.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const data = await buildDailyReportDashboard({
      date: searchParams.get("date") ?? undefined,
      outlet: searchParams.get("outlet") ?? undefined,
      staff_id: searchParams.get("staff_id") ?? undefined,
      report_template_id: searchParams.get("report_template_id") ?? undefined,
      submit_status:
        (searchParams.get("submit_status") as
          | "submitted"
          | "not_submitted"
          | "all"
          | null) ?? undefined,
    });
    return ok(data);
  } catch (error) {
    if (error instanceof DailyActivityError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[GET /api/staff-reports/dashboard]", error);
    const message =
      error instanceof Error ? error.message : String(error ?? "");
    const looksLikeMissingSchema =
      /does not exist|P2021|P2022|relation .* does not exist|column .* does not exist/i.test(
        message,
      );
    return fail(
      looksLikeMissingSchema
        ? "Gagal memuat dashboard daily report — jalankan pnpm db:migrate:deploy (SOP + leader columns)"
        : "Gagal memuat dashboard daily report",
      {
        code: looksLikeMissingSchema
          ? "DAILY_DASHBOARD_SCHEMA_MISSING"
          : "DAILY_DASHBOARD_FAILED",
        status: 500,
      },
    );
  }
}

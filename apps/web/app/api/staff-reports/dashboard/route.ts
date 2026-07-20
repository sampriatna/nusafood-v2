import type { DailyReportFilters } from "@nusafood/types";
import { buildDailyReportDashboard } from "@/lib/staff-report-store";
import { ensureStaffReportCache } from "@/lib/ensure-staff-report-cache";
import { requireAuth } from "@/lib/require-auth";
import { ok } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureStaffReportCache();
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const filters: DailyReportFilters = {
    date: searchParams.get("date") || undefined,
    outlet: searchParams.get("outlet") || undefined,
    staff_id: searchParams.get("staff_id") || undefined,
    report_template_id: searchParams.get("report_template_id") || undefined,
    submit_status:
      (searchParams.get("submit_status") as DailyReportFilters["submit_status"]) ||
      undefined,
  };

  return ok(buildDailyReportDashboard(filters));
}

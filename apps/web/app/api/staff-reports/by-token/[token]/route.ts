import { fail, ok } from "@/lib/api/response";
import {
  DailyActivityError,
  getStaffReportByToken,
} from "@/lib/services/daily-activity.service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const data = await getStaffReportByToken(token);
    return ok({
      staff: data.staff,
      templates: data.templates,
      today_submissions: data.today_submissions,
      link_active: data.link.is_active,
    });
  } catch (error) {
    if (error instanceof DailyActivityError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[GET /api/staff-reports/by-token]", error);
    return fail("Gagal memuat kegiatan", {
      code: "STAFF_REPORT_LOAD_FAILED",
      status: 500,
    });
  }
}

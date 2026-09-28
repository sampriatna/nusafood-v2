import { fail, ok } from "@/lib/api/response";
import {
  DailyActivityError,
  getStaffReportByToken,
} from "@/lib/services/daily-activity.service";
import { loadSopContextForStaff } from "@/lib/services/sop-context.service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const data = await getStaffReportByToken(token);

    // Koordinasi & rekam jejak cek leader bersifat tambahan: kalau gagal, SOP tetap bisa diisi.
    const sop = await loadSopContextForStaff(data.staff.staff_id);

    return ok({
      staff: data.staff,
      templates: data.templates,
      today_submissions: data.today_submissions,
      link_active: data.link.is_active,
      coordination: sop?.coordination ?? [],
      track_record: sop?.track_record ?? null,
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

import { fail, ok } from "@/lib/api/response";
import {
  DailyActivityShiftError,
  getStaffReportShift,
} from "@/lib/services/daily-activity-shift.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token") ?? "";
    return ok(await getStaffReportShift(token));
  } catch (error) {
    if (error instanceof DailyActivityShiftError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[GET /api/staff-reports/shift]", error);
    return fail("Gagal memuat shift", { code: "SHIFT_LOAD_FAILED", status: 500 });
  }
}

/** Shift adalah jadwal kerja, bukan pilihan staff. Diatur ADMIN/LEADER dari Jadwal Mingguan. */
export async function POST() {
  return fail("Shift kerja ditetapkan oleh leader dari Jadwal Mingguan.", {
    code: "SHIFT_READ_ONLY",
    status: 403,
  });
}

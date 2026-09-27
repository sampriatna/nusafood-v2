import { fail, ok } from "@/lib/api/response";
import {
  DailyActivityShiftError,
  getStaffReportShift,
  setStaffReportShift,
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

/**
 * Fallback operasional: hanya boleh mengisi shift bila hari ini belum ditetapkan.
 * Shift yang sudah ada (dari leader atau konfirmasi pertama staff) tidak bisa diganti staff.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body.token || "");
    const shift = await setStaffReportShift({
      token,
      shiftCode: body.shift_code,
    });
    return ok({ shift_code: shift });
  } catch (error) {
    if (error instanceof DailyActivityShiftError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/staff-reports/shift]", error);
    return fail("Gagal menyimpan shift", {
      code: "SHIFT_SAVE_FAILED",
      status: 500,
    });
  }
}

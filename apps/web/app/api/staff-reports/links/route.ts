import { fail, ok } from "@/lib/api/response";
import { hasGlobalOutletScope } from "@/lib/permissions";
import { requireAuth } from "@/lib/require-auth";
import {
  DailyActivityError,
  generateStaffReportLink,
  listStaffReportLinks,
} from "@/lib/services/daily-activity.service";

export const dynamic = "force-dynamic";

function originFromRequest(request: Request): string {
  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  if (!auth.session) {
    return fail("Unauthorized", { code: "UNAUTHORIZED", status: 401 });
  }

  try {
    const data = await listStaffReportLinks(originFromRequest(request));
    const filtered = hasGlobalOutletScope(auth.session)
      ? data
      : data.filter(
          (row) =>
            row.outlet &&
            auth.session!.userOutlet &&
            row.outlet.toLowerCase() === auth.session!.userOutlet.toLowerCase(),
        );
    return ok(filtered, { total: filtered.length });
  } catch (error) {
    console.error("[GET /api/staff-reports/links]", error);
    return fail("Gagal mengambil link", {
      code: "LINK_LIST_FAILED",
      status: 500,
    });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const staffId = String(body.staff_id || "");
    if (!staffId) {
      return fail("staff_id wajib diisi", {
        code: "VALIDATION_ERROR",
        status: 400,
      });
    }
    const link = await generateStaffReportLink(
      staffId,
      originFromRequest(request),
    );
    return ok(link);
  } catch (error) {
    if (error instanceof DailyActivityError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/staff-reports/links]", error);
    return fail("Gagal generate link", {
      code: "LINK_CREATE_FAILED",
      status: 500,
    });
  }
}

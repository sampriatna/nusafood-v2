import type { ValidateStaffReportPayload } from "@nusafood/types";
import {
  assertOutletAccess,
  OutletAccessError,
} from "@/lib/outlet-scope";
import {
  getStaffSubmissionForValidate,
  validateStaffReportFromLeader,
} from "@/lib/leader-monitoring-store";
import { requireAuth } from "@/lib/require-auth";
import { ok, fail } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  if (!auth.session) {
    return fail("Unauthorized", { code: "UNAUTHORIZED", status: 401 });
  }

  try {
    const body = (await request.json()) as ValidateStaffReportPayload;
    if (body.staff_submission_id) {
      const submission = await getStaffSubmissionForValidate(
        body.staff_submission_id,
      );
      if (!submission) {
        return fail("Laporan staff tidak ditemukan.", {
          code: "NOT_FOUND",
          status: 404,
        });
      }
      assertOutletAccess(auth.session, {
        outletCode: submission.outlet,
        outletName: submission.outlet,
      });
    }

    const result = await validateStaffReportFromLeader({
      ...body,
      leader_id: body.leader_id || auth.session.userId || "LEADER",
      leader_name: body.leader_name || auth.session.userName || "Leader",
    });
    if (!result.success) {
      return fail(result.error, { status: 400 });
    }
    return ok(result.data);
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    return fail("Gagal validasi laporan.", { status: 500 });
  }
}

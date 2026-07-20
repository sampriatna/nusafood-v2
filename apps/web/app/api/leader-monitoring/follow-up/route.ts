import type { LeaderFollowUpStatus } from "@nusafood/types";
import {
  assertOutletAccess,
  OutletAccessError,
} from "@/lib/outlet-scope";
import {
  getLeaderMonitorSubmissionById,
  updateLeaderMonitorFollowUp,
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
    const body = (await request.json()) as {
      id: string;
      follow_up_status: LeaderFollowUpStatus;
      problem_note?: string;
      fix_instruction?: string;
    };
    if (!body.id || !body.follow_up_status) {
      return fail("id dan follow_up_status wajib.", { status: 400 });
    }

    const existing = getLeaderMonitorSubmissionById(body.id);
    if (!existing) {
      return fail("Laporan monitoring tidak ditemukan.", {
        code: "NOT_FOUND",
        status: 404,
      });
    }

    assertOutletAccess(auth.session, {
      outletCode: existing.outlet_id,
      outletName: existing.outlet_id,
    });

    const result = updateLeaderMonitorFollowUp(body.id, body.follow_up_status, {
      problem_note: body.problem_note,
      fix_instruction: body.fix_instruction,
    });
    if (!result.success) {
      return fail(result.error, { status: 400 });
    }
    return ok(result.data);
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    return fail("Gagal update follow up.", { status: 500 });
  }
}

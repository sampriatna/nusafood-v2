import type { LeaderFollowUpStatus } from "@nusafood/types";
import { updateLeaderMonitorFollowUp } from "@/lib/leader-monitoring-store";
import { requireAuth } from "@/lib/require-auth";
import { ok, fail } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

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
    const result = updateLeaderMonitorFollowUp(body.id, body.follow_up_status, {
      problem_note: body.problem_note,
      fix_instruction: body.fix_instruction,
    });
    if (!result.success) {
      return fail(result.error, { status: 400 });
    }
    return ok(result.data);
  } catch {
    return fail("Gagal update follow up.", { status: 500 });
  }
}

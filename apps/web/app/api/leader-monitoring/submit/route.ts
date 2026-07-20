import type { SubmitLeaderMonitorPayload } from "@nusafood/types";
import { submitLeaderMonitor } from "@/lib/leader-monitoring-store";
import { requireAuth } from "@/lib/require-auth";
import { ok, fail } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as SubmitLeaderMonitorPayload;
    const payload: SubmitLeaderMonitorPayload = {
      ...body,
      leader_id: body.leader_id || auth.session?.userId || "LEADER",
      leader_name: body.leader_name || auth.session?.userName || "Leader",
      outlet_id: body.outlet_id || auth.session?.userOutlet || body.outlet_id,
    };

    const result = await submitLeaderMonitor(payload);
    if (!result.success) {
      return fail(result.error, { status: 400 });
    }
    return ok(result.data);
  } catch {
    return fail("Gagal menyimpan checklist leader.", { status: 500 });
  }
}

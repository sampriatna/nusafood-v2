import type { SubmitLeaderMonitorPayload } from "@nusafood/types";
import { submitLeaderMonitor } from "@/lib/leader-monitoring-store";
import {
  assertCreateOutletAllowed,
  OutletAccessError,
  resolveListOutletFilter,
} from "@/lib/outlet-scope";
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
    const body = (await request.json()) as SubmitLeaderMonitorPayload;
    const outlet =
      resolveListOutletFilter(auth.session, body.outlet_id) ||
      auth.session.userOutlet;
    if (!outlet) {
      return fail("Outlet wajib diisi", { code: "OUTLET_REQUIRED", status: 400 });
    }
    assertCreateOutletAllowed(auth.session, outlet);

    const payload: SubmitLeaderMonitorPayload = {
      ...body,
      leader_id: body.leader_id || auth.session.userId || "LEADER",
      leader_name: body.leader_name || auth.session.userName || "Leader",
      outlet_id: outlet,
    };

    const result = await submitLeaderMonitor(payload);
    if (!result.success) {
      return fail(result.error, { status: 400 });
    }
    return ok(result.data);
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    return fail("Gagal menyimpan checklist leader.", { status: 500 });
  }
}

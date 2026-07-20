import type { ValidateStaffReportPayload } from "@nusafood/types";
import { validateStaffReportFromLeader } from "@/lib/leader-monitoring-store";
import { requireAuth } from "@/lib/require-auth";
import { ok, fail } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as ValidateStaffReportPayload;
    const result = await validateStaffReportFromLeader({
      ...body,
      leader_id: body.leader_id || auth.session?.userId || "LEADER",
      leader_name: body.leader_name || auth.session?.userName || "Leader",
    });
    if (!result.success) {
      return fail(result.error, { status: 400 });
    }
    return ok(result.data);
  } catch {
    return fail("Gagal validasi laporan.", { status: 500 });
  }
}

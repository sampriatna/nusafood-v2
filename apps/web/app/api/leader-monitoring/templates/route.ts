import { listLeaderMonitorTemplates } from "@/lib/leader-monitoring-store";
import { ensureStaffReportCache } from "@/lib/ensure-staff-report-cache";
import { requireAuth } from "@/lib/require-auth";
import { ok } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureStaffReportCache();
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const outlet = searchParams.get("outlet") || undefined;

  return ok(listLeaderMonitorTemplates(outlet));
}

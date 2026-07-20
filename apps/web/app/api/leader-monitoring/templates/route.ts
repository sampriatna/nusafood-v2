import { listLeaderMonitorTemplates } from "@/lib/leader-monitoring-store";
import { requireAuth } from "@/lib/require-auth";
import { ok } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const outlet = searchParams.get("outlet") || undefined;

  return ok(listLeaderMonitorTemplates(outlet));
}

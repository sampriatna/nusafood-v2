import type {
  LeaderMonitorFilters,
  LeaderMonitorKind,
  LeaderFollowUpStatus,
} from "@nusafood/types";
import { buildLeaderMonitorDashboard } from "@/lib/leader-monitoring-store";
import { requireAuth } from "@/lib/require-auth";
import { ok } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const filters: LeaderMonitorFilters = {
    date: searchParams.get("date") || undefined,
    outlet: searchParams.get("outlet") || auth.session?.userOutlet || undefined,
    kind: (searchParams.get("kind") as LeaderMonitorKind | "ALL") || undefined,
    follow_up:
      (searchParams.get("follow_up") as LeaderFollowUpStatus | "ALL") || undefined,
  };

  return ok(await buildLeaderMonitorDashboard(filters));
}

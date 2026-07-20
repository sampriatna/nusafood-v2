import type {
  LeaderMonitorFilters,
  LeaderMonitorKind,
  LeaderFollowUpStatus,
} from "@nusafood/types";
import { buildLeaderMonitorDashboard } from "@/lib/leader-monitoring-store";
import { resolveListOutletFilter, OutletAccessError } from "@/lib/outlet-scope";
import { requireAuth } from "@/lib/require-auth";
import { ok, fail } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  if (!auth.session) {
    return fail("Unauthorized", { code: "UNAUTHORIZED", status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const outlet = resolveListOutletFilter(
      auth.session,
      searchParams.get("outlet"),
    );
    const filters: LeaderMonitorFilters = {
      date: searchParams.get("date") || undefined,
      outlet,
      kind: (searchParams.get("kind") as LeaderMonitorKind | "ALL") || undefined,
      follow_up:
        (searchParams.get("follow_up") as LeaderFollowUpStatus | "ALL") ||
        undefined,
    };

    return ok(await buildLeaderMonitorDashboard(filters));
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[GET /api/leader-monitoring/dashboard]", error);
    return fail("Gagal memuat dashboard", {
      code: "LEADER_DASHBOARD_FAILED",
      status: 500,
    });
  }
}

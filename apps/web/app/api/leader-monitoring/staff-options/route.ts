import type { Staff } from "@nusafood/types";
import { getLeaderStaffOptions } from "@/lib/leader-monitoring-store";
import { setStaffCache } from "@/lib/staff-report-store";
import { ensureStaffReportCache } from "@/lib/ensure-staff-report-cache";
import { requireAuth } from "@/lib/require-auth";
import { ok, fail } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureStaffReportCache();
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const outlet = searchParams.get("outlet") || auth.session?.userOutlet || undefined;

  return ok(getLeaderStaffOptions(outlet));
}

/** Optional: push staff list from client so picker is complete. */
export async function POST(request: Request) {
  await ensureStaffReportCache();
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as { staff?: Staff[]; outlet?: string };
    if (body.staff?.length) {
      setStaffCache(body.staff);
    }
    const outlet = body.outlet || auth.session?.userOutlet || undefined;
    return ok(getLeaderStaffOptions(outlet));
  } catch {
    return fail("Gagal sync staff.", { status: 500 });
  }
}

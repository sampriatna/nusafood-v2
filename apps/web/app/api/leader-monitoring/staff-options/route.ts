import { getLeaderStaffOptions } from "@/lib/leader-monitoring-store";
import { resolveListOutletFilter } from "@/lib/outlet-scope";
import { requireAuth } from "@/lib/require-auth";
import { fail, ok } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  if (!auth.session) {
    return fail("Unauthorized", { code: "UNAUTHORIZED", status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const outlet = resolveListOutletFilter(
    auth.session,
    searchParams.get("outlet"),
  );

  return ok(await getLeaderStaffOptions(outlet));
}

import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { OutletAccessError, resolveListOutletFilter } from "@/lib/outlet-scope";
import type { GroupBy } from "@/lib/performance";
import { getPerformance, isPerformancePeriod } from "@/lib/services/performance.service";

export const dynamic = "force-dynamic";

const GROUPS: GroupBy[] = ["person", "division", "outlet"];

/** Dashboard kinerja: tepat waktu / terlambat per orang, divisi, atau outlet. */
export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get("period");
    const groupParam = searchParams.get("group") as GroupBy | null;
    const outlet = auth.session
      ? resolveListOutletFilter(auth.session, searchParams.get("outlet"))
      : searchParams.get("outlet") || undefined;

    return ok(
      await getPerformance({
        period: isPerformancePeriod(periodParam) ? periodParam : "30d",
        groupBy: groupParam && GROUPS.includes(groupParam) ? groupParam : "person",
        outlet,
      }),
    );
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[GET /api/performance]", error);
    return fail("Gagal memuat data kinerja", { code: "PERFORMANCE_FAILED", status: 500 });
  }
}

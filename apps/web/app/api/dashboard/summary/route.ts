import { fail, ok } from "@/lib/api/response";
import { getDashboardSummary } from "@/lib/services/dashboard.service";
import { requireAuth } from "@/lib/require-auth";
import { resolveListOutletFilter } from "@/lib/outlet-scope";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const outlet = resolveListOutletFilter(
      auth.session!,
      searchParams.get("outlet"),
    );
    const data = await getDashboardSummary({
      outlet,
      date_from: searchParams.get("date_from") ?? undefined,
      date_to: searchParams.get("date_to") ?? undefined,
    });
    return ok(data);
  } catch (error) {
    console.error("[GET /api/dashboard/summary]", error);
    return fail("Gagal mengambil ringkasan dashboard", {
      code: "DASHBOARD_SUMMARY_FAILED",
      status: 500,
    });
  }
}

import { fail, ok } from "@/lib/api/response";
import { listChecklistReports } from "@/lib/services/checklist.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await listChecklistReports({
      outlet: searchParams.get("outlet") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });
    return ok(data, { total: data.length });
  } catch (error) {
    console.error("[GET /api/checklist-reports]", error);
    return fail("Gagal mengambil laporan checklist", { status: 500 });
  }
}

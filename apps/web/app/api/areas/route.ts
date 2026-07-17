import { fail, ok } from "@/lib/api/response";
import { listAreas } from "@/lib/services/master-data.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const outlet = new URL(request.url).searchParams.get("outlet") ?? undefined;
    const data = await listAreas(outlet);
    return ok(data, { total: data.length });
  } catch (error) {
    console.error("[GET /api/areas]", error);
    return fail("Gagal mengambil data area", {
      code: "AREAS_LIST_FAILED",
      status: 500,
    });
  }
}

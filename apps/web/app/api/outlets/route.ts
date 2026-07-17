import { fail, ok } from "@/lib/api/response";
import { listOutlets } from "@/lib/services/master-data.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await listOutlets();
    return ok(data, { total: data.length });
  } catch (error) {
    console.error("[GET /api/outlets]", error);
    return fail("Gagal mengambil data outlet", {
      code: "OUTLETS_LIST_FAILED",
      status: 500,
    });
  }
}

import { fail, ok } from "@/lib/api/response";
import { listCategories } from "@/lib/services/master-data.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await listCategories();
    return ok(data, { total: data.length });
  } catch (error) {
    console.error("[GET /api/categories]", error);
    return fail("Gagal mengambil data kategori", {
      code: "CATEGORIES_LIST_FAILED",
      status: 500,
    });
  }
}

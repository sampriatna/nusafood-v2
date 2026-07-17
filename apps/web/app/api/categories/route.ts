import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  MasterDataError,
  createCategory,
  listCategories,
} from "@/lib/services/master-data.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

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

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as { name?: string };
    if (!body.name) {
      return fail("name wajib", { status: 400 });
    }
    const data = await createCategory(body.name);
    return ok(data, undefined, { status: 201 });
  } catch (error) {
    if (error instanceof MasterDataError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/categories]", error);
    return fail("Gagal membuat kategori", {
      code: "CATEGORY_CREATE_FAILED",
      status: 500,
    });
  }
}

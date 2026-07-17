import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  MasterDataError,
  deleteCategory,
} from "@/lib/services/master-data.service";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const { name } = await context.params;
    const data = await deleteCategory(decodeURIComponent(name));
    return ok(data);
  } catch (error) {
    if (error instanceof MasterDataError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[DELETE /api/categories/:name]", error);
    return fail("Gagal menghapus kategori", {
      code: "CATEGORY_DELETE_FAILED",
      status: 500,
    });
  }
}

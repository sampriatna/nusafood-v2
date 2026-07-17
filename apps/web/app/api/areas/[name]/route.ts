import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  MasterDataError,
  deleteArea,
} from "@/lib/services/master-data.service";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const { name } = await context.params;
    const outlet = new URL(request.url).searchParams.get("outlet");
    if (!outlet) {
      return fail("Query outlet wajib", { status: 400 });
    }
    const decodedName = decodeURIComponent(name);
    const data = await deleteArea(outlet, decodedName);
    return ok(data);
  } catch (error) {
    if (error instanceof MasterDataError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[DELETE /api/areas/:name]", error);
    return fail("Gagal menghapus area", {
      code: "AREA_DELETE_FAILED",
      status: 500,
    });
  }
}

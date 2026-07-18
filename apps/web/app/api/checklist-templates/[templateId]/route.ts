import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  OutletAccessError,
  assertChecklistTemplateOutletAccess,
} from "@/lib/outlet-scope";
import { getChecklistTemplate } from "@/lib/services/checklist.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ templateId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { templateId } = await params;
    await assertChecklistTemplateOutletAccess(auth.session!, templateId);
    const data = await getChecklistTemplate(templateId);
    if (!data) {
      return fail("Template tidak ditemukan", {
        code: "NOT_FOUND",
        status: 404,
      });
    }
    return ok(data);
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[GET /api/checklist-templates/:id]", error);
    return fail("Gagal mengambil template", { status: 500 });
  }
}

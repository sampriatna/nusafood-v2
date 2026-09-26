import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  OutletAccessError,
  assertRecurringTemplateOutletAccess,
} from "@/lib/outlet-scope";
import { ChecklistError } from "@/lib/services/checklist.service";
import {
  getRecurringTemplate,
  updateRecurringTemplate,
} from "@/lib/services/recurring.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ templateId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { templateId } = await params;
    await assertRecurringTemplateOutletAccess(auth.session!, templateId);
    const data = await getRecurringTemplate(templateId);
    if (!data) {
      return fail("Template tidak ditemukan", { status: 404 });
    }
    return ok(data);
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[GET /api/recurring-templates/:id]", error);
    return fail("Gagal mengambil template", { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { templateId } = await params;
    if (auth.session) await assertRecurringTemplateOutletAccess(auth.session, templateId);
    const body = (await request.json()) as Parameters<typeof updateRecurringTemplate>[1];
    return ok(await updateRecurringTemplate(templateId, body));
  } catch (error) {
    if (error instanceof OutletAccessError || error instanceof ChecklistError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[PATCH /api/recurring-templates/:id]", error);
    return fail("Gagal menyimpan template", { status: 500 });
  }
}

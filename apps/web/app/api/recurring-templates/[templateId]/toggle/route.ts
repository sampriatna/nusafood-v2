import { fail, ok } from "@/lib/api/response";
import { ChecklistError } from "@/lib/services/checklist.service";
import { requireAuth } from "@/lib/require-auth";
import {
  OutletAccessError,
  assertRecurringTemplateOutletAccess,
} from "@/lib/outlet-scope";
import { toggleRecurringTemplate } from "@/lib/services/recurring.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ templateId: string }> };

export async function PATCH(_request: Request, { params }: Params) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { templateId } = await params;
    await assertRecurringTemplateOutletAccess(auth.session!, templateId);
    const data = await toggleRecurringTemplate(templateId);
    return ok(data);
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    if (error instanceof ChecklistError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[PATCH /api/recurring-templates/:id/toggle]", error);
    return fail("Gagal toggle template", { status: 500 });
  }
}

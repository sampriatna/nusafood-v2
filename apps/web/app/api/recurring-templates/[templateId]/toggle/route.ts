import { fail, ok } from "@/lib/api/response";
import { ChecklistError } from "@/lib/services/checklist.service";
import { toggleRecurringTemplate } from "@/lib/services/recurring.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ templateId: string }> };

export async function PATCH(_request: Request, { params }: Params) {
  try {
    const { templateId } = await params;
    const data = await toggleRecurringTemplate(templateId);
    return ok(data);
  } catch (error) {
    if (error instanceof ChecklistError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[PATCH /api/recurring-templates/:id/toggle]", error);
    return fail("Gagal toggle template", { status: 500 });
  }
}

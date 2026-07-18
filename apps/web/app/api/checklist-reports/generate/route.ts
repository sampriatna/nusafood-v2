import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  OutletAccessError,
  assertChecklistTemplateOutletAccess,
} from "@/lib/outlet-scope";
import {
  ChecklistError,
  generateChecklistReport,
} from "@/lib/services/checklist.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      template_id?: string;
      pic_name?: string;
      pic_wa?: string;
      deadline?: string;
    };
    if (!body.template_id) {
      return fail("template_id wajib", { status: 400 });
    }
    await assertChecklistTemplateOutletAccess(auth.session!, body.template_id);
    const data = await generateChecklistReport({
      template_id: body.template_id,
      pic_name: body.pic_name,
      pic_wa: body.pic_wa,
      deadline: body.deadline,
    });
    return ok(data, undefined, { status: 201 });
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    if (error instanceof ChecklistError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/checklist-reports/generate]", error);
    return fail("Gagal generate checklist", { status: 500 });
  }
}

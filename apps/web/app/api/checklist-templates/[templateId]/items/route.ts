import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  OutletAccessError,
  assertChecklistTemplateOutletAccess,
} from "@/lib/outlet-scope";
import {
  ChecklistError,
  saveChecklistItems,
} from "@/lib/services/checklist.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ templateId: string }> };

export async function PUT(request: Request, { params }: Params) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { templateId } = await params;
    await assertChecklistTemplateOutletAccess(auth.session!, templateId);
    const body = (await request.json()) as {
      items?: Array<{
        item_text: string;
        item_order?: number;
        requires_photo?: boolean;
        is_required?: boolean;
        active_status?: boolean;
        checklist_item_id?: string;
      }>;
    };
    const items = body.items ?? [];
    const data = await saveChecklistItems(templateId, items);
    return ok(data);
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    if (error instanceof ChecklistError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[PUT /api/checklist-templates/:id/items]", error);
    return fail("Gagal menyimpan items", { status: 500 });
  }
}

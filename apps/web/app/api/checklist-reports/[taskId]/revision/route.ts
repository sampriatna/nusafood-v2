import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  OutletAccessError,
  assertTaskOutletAccess,
} from "@/lib/outlet-scope";
import {
  ChecklistError,
  requestChecklistRevision,
} from "@/lib/services/checklist.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ taskId: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { taskId } = await params;
    await assertTaskOutletAccess(auth.session!, taskId);
    const body = (await request.json()) as {
      revision_note?: string;
      verified_by?: string;
    };
    const data = await requestChecklistRevision(
      taskId,
      body.revision_note ?? "",
      body.verified_by,
    );
    return ok(data);
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    if (error instanceof ChecklistError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/checklist-reports/:id/revision]", error);
    return fail("Gagal minta revisi checklist", { status: 500 });
  }
}

import { actorFromAuth, projectFail } from "@/lib/api/project-route";
import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { addMilestoneStep } from "@/lib/services/project-pic.service";

export async function POST(request: Request, context: { params: Promise<{ milestoneId: string }> }) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const { milestoneId } = await context.params;
    const body = await request.json();
    const itemText = String(body.item_text || "").trim();
    if (!itemText) return fail("Langkah checklist wajib diisi", { code: "STEP_TEXT_REQUIRED", status: 422 });
    return ok(
      await addMilestoneStep(
        milestoneId,
        {
          item_text: itemText,
          is_required: body.is_required !== false,
          requires_evidence: Boolean(body.requires_evidence),
        },
        actorFromAuth(auth),
      ),
      undefined,
      { status: 201 },
    );
  } catch (error) {
    return projectFail(error, "Gagal menambah checklist");
  }
}

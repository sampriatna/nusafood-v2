import { actorFromAuth, projectFail } from "@/lib/api/project-route";
import { ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { deleteMilestoneStep, updateMilestoneStep } from "@/lib/services/project-pic.service";

export async function PATCH(request: Request, context: { params: Promise<{ stepId: string }> }) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const { stepId } = await context.params;
    const body = await request.json();
    const patch: Parameters<typeof updateMilestoneStep>[1] = {};
    if (body.item_text !== undefined) patch.item_text = String(body.item_text);
    if (body.is_required !== undefined) patch.is_required = Boolean(body.is_required);
    if (body.requires_evidence !== undefined) patch.requires_evidence = Boolean(body.requires_evidence);
    if (body.move === "up" || body.move === "down") patch.move = body.move;
    return ok(await updateMilestoneStep(stepId, patch));
  } catch (error) {
    return projectFail(error, "Gagal memperbarui checklist");
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ stepId: string }> }) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const { stepId } = await context.params;
    await deleteMilestoneStep(stepId, actorFromAuth(auth));
    return ok({ deleted: true });
  } catch (error) {
    return projectFail(error, "Gagal menghapus checklist");
  }
}

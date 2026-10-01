import { actorFromAuth, projectFail } from "@/lib/api/project-route";
import { ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { deleteMilestone, updateMilestone } from "@/lib/services/project.service";

/** Status milestone TIDAK bisa diubah manual dari sini; hanya lewat event sistem (centang, submit, review, reopen). */
export async function PATCH(request: Request, context: { params: Promise<{ milestoneId: string }> }) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const { milestoneId } = await context.params;
    const body = await request.json();
    const patch: Parameters<typeof updateMilestone>[1] = {};
    if (body.title !== undefined) patch.title = String(body.title).slice(0, 300);
    if (body.description !== undefined) patch.description = body.description ? String(body.description) : null;
    if (body.weight !== undefined) patch.weight = Number(body.weight);
    if (body.deadline !== undefined) patch.deadline = body.deadline || null;
    await updateMilestone(milestoneId, patch, actorFromAuth(auth));
    return ok({ updated: true });
  } catch (error) {
    return projectFail(error, "Gagal memperbarui milestone");
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ milestoneId: string }> }) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const { milestoneId } = await context.params;
    await deleteMilestone(milestoneId, actorFromAuth(auth));
    return ok({ deleted: true });
  } catch (error) {
    return projectFail(error, "Gagal menghapus milestone");
  }
}

import { actorFromAuth, projectFail } from "@/lib/api/project-route";
import { ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { deleteWorkstream, updateWorkstream } from "@/lib/services/project.service";

export async function PATCH(request: Request, context: { params: Promise<{ workstreamId: string }> }) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const { workstreamId } = await context.params;
    const body = await request.json();
    const patch: Parameters<typeof updateWorkstream>[1] = {};
    if (body.name !== undefined) patch.name = String(body.name).slice(0, 200);
    if (body.owner_staff_id !== undefined) {
      patch.owner_staff_id = body.owner_staff_id ? String(body.owner_staff_id) : null;
    }
    if (body.weight !== undefined) patch.weight = Number(body.weight);
    if (body.deadline !== undefined) patch.deadline = body.deadline || null;
    if (body.next_action !== undefined) patch.next_action = body.next_action ? String(body.next_action) : null;
    await updateWorkstream(workstreamId, patch, actorFromAuth(auth));
    return ok({ updated: true });
  } catch (error) {
    return projectFail(error, "Gagal memperbarui bagian kerja");
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ workstreamId: string }> }) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const { workstreamId } = await context.params;
    await deleteWorkstream(workstreamId, actorFromAuth(auth));
    return ok({ deleted: true });
  } catch (error) {
    return projectFail(error, "Gagal menghapus bagian kerja");
  }
}

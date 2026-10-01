import { actorFromAuth, projectFail } from "@/lib/api/project-route";
import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { linkTask, listLinkedTasks, unlinkTask } from "@/lib/services/project-structure.service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const { projectId } = await context.params;
    return ok(await listLinkedTasks(projectId));
  } catch (error) {
    return projectFail(error, "Gagal memuat task terkait");
  }
}

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const { projectId } = await context.params;
    const body = await request.json();
    const taskId = String(body.task_id || "").trim();
    if (!taskId) return fail("ID task wajib diisi", { status: 422 });
    await linkTask(projectId, { task_id: taskId, milestone_id: body.milestone_id ? String(body.milestone_id) : null }, actorFromAuth(auth));
    return ok({ linked: true }, undefined, { status: 201 });
  } catch (error) {
    return projectFail(error, "Gagal menghubungkan task");
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const { projectId } = await context.params;
    const body = await request.json();
    await unlinkTask(projectId, String(body.link_id || ""), actorFromAuth(auth));
    return ok({ unlinked: true });
  } catch (error) {
    return projectFail(error, "Gagal melepas task");
  }
}

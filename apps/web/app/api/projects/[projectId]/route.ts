import { actorFromAuth, projectFail } from "@/lib/api/project-route";
import { fail, ok } from "@/lib/api/response";
import type { ProjectHealth, ProjectStatus } from "@/lib/project-types";
import { requireAuth } from "@/lib/require-auth";
import { getProject, updateProject, type ProjectPatch } from "@/lib/services/project.service";

const STATUSES = new Set<ProjectStatus>(["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]);
const HEALTH = new Set<ProjectHealth>(["ON_TRACK", "NEED_ATTENTION", "BLOCKED", "COMPLETED"]);

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const { projectId } = await context.params;
    const project = await getProject(projectId);
    return project ? ok(project) : fail("Project tidak ditemukan", { status: 404 });
  } catch (error) {
    return projectFail(error, "Gagal memuat project");
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const { projectId } = await context.params;
    const body = await request.json();
    const patch: ProjectPatch = {};
    if (body.name !== undefined) patch.name = String(body.name).slice(0, 200);
    if (body.goal !== undefined) patch.goal = body.goal ? String(body.goal) : null;
    if (body.lead_staff_id !== undefined) {
      patch.lead_staff_id = body.lead_staff_id ? String(body.lead_staff_id) : null;
    }
    if (body.status !== undefined) {
      if (!STATUSES.has(body.status)) return fail("Status project tidak valid", { status: 422 });
      patch.status = body.status;
    }
    if (body.health_override !== undefined) {
      if (body.health_override !== null && !HEALTH.has(body.health_override)) {
        return fail("Kondisi project tidak valid", { status: 422 });
      }
      patch.health_override = body.health_override;
    }
    if (body.start_date !== undefined) patch.start_date = body.start_date || null;
    if (body.deadline !== undefined) patch.deadline = body.deadline || null;
    if (body.next_action !== undefined) patch.next_action = body.next_action ? String(body.next_action) : null;

    const project = await updateProject(projectId, patch, actorFromAuth(auth));
    return project ? ok(project) : fail("Project tidak ditemukan", { status: 404 });
  } catch (error) {
    return projectFail(error, "Gagal memperbarui project");
  }
}

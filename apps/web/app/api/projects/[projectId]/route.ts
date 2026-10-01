import { fail, ok, publicErrorMessage } from "@/lib/api/response";
import type { ProjectHealth, ProjectStatus } from "@/lib/project-types";
import { requireAuth } from "@/lib/require-auth";
import {
  getProject,
  updateProject,
} from "@/lib/services/project.service";

const PROJECT_STATUSES = new Set<ProjectStatus>([
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
]);
const PROJECT_HEALTH = new Set<ProjectHealth>([
  "ON_TRACK",
  "NEED_ATTENTION",
  "BLOCKED",
  "COMPLETED",
]);

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { projectId } = await context.params;
    const project = await getProject(projectId);
    return project ? ok(project) : fail("Project tidak ditemukan", { status: 404 });
  } catch (error) {
    return fail(publicErrorMessage(error, "Gagal memuat project"), {
      status: 500,
    });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { projectId } = await context.params;
    const body = await request.json();
    const patch: Parameters<typeof updateProject>[1] = {};

    if (body.name !== undefined) patch.name = String(body.name);
    if (body.goal !== undefined) patch.goal = body.goal ? String(body.goal) : null;
    if (body.lead_staff_id !== undefined) {
      patch.lead_staff_id = body.lead_staff_id ? String(body.lead_staff_id) : null;
    }
    if (body.status !== undefined) {
      if (!PROJECT_STATUSES.has(body.status)) return fail("Status project tidak valid");
      patch.status = body.status;
    }
    if (body.health !== undefined) {
      if (!PROJECT_HEALTH.has(body.health)) return fail("Kondisi project tidak valid");
      patch.health = body.health;
    }
    if (body.start_date !== undefined) patch.start_date = body.start_date || null;
    if (body.deadline !== undefined) patch.deadline = body.deadline || null;
    if (body.next_action !== undefined) {
      patch.next_action = body.next_action ? String(body.next_action) : null;
    }
    if (body.blocker !== undefined) {
      patch.blocker = body.blocker ? String(body.blocker) : null;
    }

    const project = await updateProject(projectId, patch);
    return project ? ok(project) : fail("Project tidak ditemukan", { status: 404 });
  } catch (error) {
    return fail(publicErrorMessage(error, "Gagal memperbarui project"), {
      status: 500,
    });
  }
}

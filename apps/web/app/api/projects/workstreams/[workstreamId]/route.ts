import { fail, ok, publicErrorMessage } from "@/lib/api/response";
import type { ProjectHealth, ProjectStatus } from "@/lib/project-types";
import { requireAuth } from "@/lib/require-auth";
import { updateWorkstream } from "@/lib/services/project.service";

const STATUSES = new Set<ProjectStatus>([
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
]);
const HEALTH = new Set<ProjectHealth>([
  "ON_TRACK",
  "NEED_ATTENTION",
  "BLOCKED",
  "COMPLETED",
]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ workstreamId: string }> },
) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { workstreamId } = await context.params;
    const body = await request.json();
    const patch: Parameters<typeof updateWorkstream>[1] = {};

    if (body.owner_staff_id !== undefined) {
      patch.owner_staff_id = body.owner_staff_id ? String(body.owner_staff_id) : null;
    }
    if (body.weight !== undefined) patch.weight = Number(body.weight);
    if (body.status !== undefined) {
      if (!STATUSES.has(body.status)) return fail("Status workstream tidak valid");
      patch.status = body.status;
    }
    if (body.health !== undefined) {
      if (!HEALTH.has(body.health)) return fail("Kondisi workstream tidak valid");
      patch.health = body.health;
    }
    if (body.deadline !== undefined) patch.deadline = body.deadline || null;
    if (body.next_action !== undefined) {
      patch.next_action = body.next_action ? String(body.next_action) : null;
    }
    if (body.blocker !== undefined) {
      patch.blocker = body.blocker ? String(body.blocker) : null;
    }

    await updateWorkstream(workstreamId, patch);
    return ok({ updated: true });
  } catch (error) {
    return fail(publicErrorMessage(error, "Gagal memperbarui workstream"), {
      status: 500,
    });
  }
}

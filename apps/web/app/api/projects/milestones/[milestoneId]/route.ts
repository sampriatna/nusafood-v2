import { fail, ok, publicErrorMessage } from "@/lib/api/response";
import type { MilestoneStatus } from "@/lib/project-types";
import { requireAuth } from "@/lib/require-auth";
import { updateMilestone } from "@/lib/services/project.service";

const STATUSES = new Set<MilestoneStatus>([
  "NOT_STARTED",
  "IN_PROGRESS",
  "WAITING_VALIDATION",
  "REVISION",
  "DONE",
  "BLOCKED",
]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ milestoneId: string }> },
) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { milestoneId } = await context.params;
    const body = await request.json();
    const patch: Parameters<typeof updateMilestone>[1] = {};

    if (body.status !== undefined) {
      if (!STATUSES.has(body.status)) return fail("Status milestone tidak valid");
      patch.status = body.status;
    }
    if (body.evidence_url !== undefined) {
      patch.evidence_url = body.evidence_url ? String(body.evidence_url) : null;
    }

    await updateMilestone(milestoneId, patch);
    return ok({ updated: true });
  } catch (error) {
    return fail(publicErrorMessage(error, "Gagal memperbarui milestone"), {
      status: 500,
    });
  }
}

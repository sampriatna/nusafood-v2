import { actorFromAuth, projectFail } from "@/lib/api/project-route";
import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { reviewProjectMilestone } from "@/lib/services/project-pic.service";

export async function POST(request: Request, context: { params: Promise<{ milestoneId: string }> }) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const { milestoneId } = await context.params;
    const body = await request.json();
    const decision = String(body.decision || "").toUpperCase();
    if (decision !== "APPROVED" && decision !== "REVISION") {
      return fail("Keputusan validasi tidak valid", { status: 422 });
    }
    await reviewProjectMilestone(
      milestoneId,
      { decision, note: body.note ? String(body.note).slice(0, 2000) : null },
      actorFromAuth(auth),
    );
    return ok({ reviewed: true });
  } catch (error) {
    return projectFail(error, "Gagal memvalidasi milestone");
  }
}

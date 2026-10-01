import { actorFromAuth, projectFail } from "@/lib/api/project-route";
import { ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { reopenMilestone } from "@/lib/services/project.service";

export async function POST(request: Request, context: { params: Promise<{ milestoneId: string }> }) {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;
  try {
    const { milestoneId } = await context.params;
    const body = await request.json();
    await reopenMilestone(milestoneId, String(body.note || ""), actorFromAuth(auth));
    return ok({ reopened: true });
  } catch (error) {
    return projectFail(error, "Gagal membuka kembali milestone");
  }
}

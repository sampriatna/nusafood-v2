import { actorFromAuth, projectFail } from "@/lib/api/project-route";
import { ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { publishAndShare } from "@/lib/services/project-pic.service";

export async function POST(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const { projectId } = await context.params;
    return ok(await publishAndShare(projectId, actorFromAuth(auth)));
  } catch (error) {
    return projectFail(error, "Gagal membagikan project");
  }
}

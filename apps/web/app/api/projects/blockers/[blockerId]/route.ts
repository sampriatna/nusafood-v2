import { actorFromAuth, projectFail } from "@/lib/api/project-route";
import { ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { resolveBlocker } from "@/lib/services/project.service";

/** Owner menandai kendala selesai. */
export async function POST(_request: Request, context: { params: Promise<{ blockerId: string }> }) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const { blockerId } = await context.params;
    await resolveBlocker(blockerId, actorFromAuth(auth));
    return ok({ resolved: true });
  } catch (error) {
    return projectFail(error, "Gagal menyelesaikan kendala");
  }
}

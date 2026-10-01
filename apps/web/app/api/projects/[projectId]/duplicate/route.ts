import { actorFromAuth, projectFail } from "@/lib/api/project-route";
import { ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { duplicateProject } from "@/lib/services/project-structure.service";

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const { projectId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const created = await duplicateProject(projectId, { name: body.name ? String(body.name) : undefined }, actorFromAuth(auth));
    return ok(created, undefined, { status: 201 });
  } catch (error) {
    return projectFail(error, "Gagal menduplikasi project");
  }
}

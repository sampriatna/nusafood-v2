import { ok } from "@/lib/api/response";
import { PROJECT_TEMPLATES } from "@/lib/project-templates";
import { requireAuth } from "@/lib/require-auth";

export async function GET() {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  return ok(
    PROJECT_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      milestone_count: t.structure.workstreams.reduce((n, w) => n + w.milestones.length, 0),
    })),
  );
}

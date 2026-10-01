import { actorFromAuth, projectFail } from "@/lib/api/project-route";
import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { createProject, listProjects } from "@/lib/services/project.service";
import { createProjectFromTemplate } from "@/lib/services/project-structure.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    return ok(await listProjects());
  } catch (error) {
    return projectFail(error, "Gagal memuat project");
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    if (!name) return fail("Nama project wajib diisi", { code: "NAME_REQUIRED", status: 422 });
    const input = {
      name: name.slice(0, 200),
      goal: body.goal ? String(body.goal) : null,
      lead_staff_id: body.lead_staff_id ? String(body.lead_staff_id) : null,
      start_date: body.start_date ? String(body.start_date) : null,
      deadline: body.deadline ? String(body.deadline) : null,
    };
    const project = body.template_id
      ? await createProjectFromTemplate(String(body.template_id), input, actorFromAuth(auth))
      : await createProject(input, actorFromAuth(auth));
    return ok(project, undefined, { status: 201 });
  } catch (error) {
    return projectFail(error, "Gagal membuat project");
  }
}

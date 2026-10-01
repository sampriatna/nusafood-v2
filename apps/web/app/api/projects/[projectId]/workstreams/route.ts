import { actorFromAuth, projectFail } from "@/lib/api/project-route";
import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { createSimpleWorkstream, createWorkstream } from "@/lib/services/project.service";

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const { projectId } = await context.params;
    const body = await request.json();
    const actor = actorFromAuth(auth);
    if (body.simple === true) {
      await createSimpleWorkstream(projectId, actor);
      return ok({ created: true }, undefined, { status: 201 });
    }
    const name = String(body.name || "").trim();
    if (!name) return fail("Nama bagian wajib diisi", { code: "NAME_REQUIRED", status: 422 });
    await createWorkstream(
      projectId,
      {
        name: name.slice(0, 200),
        owner_staff_id: body.owner_staff_id ? String(body.owner_staff_id) : null,
        weight: Number(body.weight || 1),
        deadline: body.deadline ? String(body.deadline) : null,
      },
      actor,
    );
    return ok({ created: true }, undefined, { status: 201 });
  } catch (error) {
    return projectFail(error, "Gagal membuat bagian kerja");
  }
}

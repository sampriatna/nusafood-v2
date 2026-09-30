import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { createWorkstream } from "@/lib/services/project.service";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { projectId } = await context.params;
    const body = await request.json();
    const name = String(body.name || "").trim();
    if (!name) return fail("Nama workstream wajib diisi");

    await createWorkstream(projectId, {
      name,
      owner_staff_id: body.owner_staff_id ? String(body.owner_staff_id) : null,
      weight: Number(body.weight || 1),
      deadline: body.deadline ? String(body.deadline) : null,
      next_action: body.next_action ? String(body.next_action) : null,
    });

    return ok({ created: true }, undefined, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Gagal membuat workstream", {
      status: 500,
    });
  }
}

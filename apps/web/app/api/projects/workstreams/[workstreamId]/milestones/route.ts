import { fail, ok, publicErrorMessage } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { createMilestone } from "@/lib/services/project.service";

export async function POST(
  request: Request,
  context: { params: Promise<{ workstreamId: string }> },
) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { workstreamId } = await context.params;
    const body = await request.json();
    const title = String(body.title || "").trim();
    if (!title) return fail("Nama milestone wajib diisi");

    await createMilestone(workstreamId, {
      title,
      description: body.description ? String(body.description) : null,
      weight: Number(body.weight || 1),
      deadline: body.deadline ? String(body.deadline) : null,
    });

    return ok({ created: true }, undefined, { status: 201 });
  } catch (error) {
    return fail(publicErrorMessage(error, "Gagal membuat milestone"), {
      status: 500,
    });
  }
}

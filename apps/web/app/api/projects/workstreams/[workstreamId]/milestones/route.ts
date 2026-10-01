import { actorFromAuth, projectFail } from "@/lib/api/project-route";
import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { createMilestone } from "@/lib/services/project.service";

export async function POST(request: Request, context: { params: Promise<{ workstreamId: string }> }) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const { workstreamId } = await context.params;
    const body = await request.json();
    const title = String(body.title || "").trim();
    if (!title) return fail("Nama milestone wajib diisi", { code: "TITLE_REQUIRED", status: 422 });
    const steps = Array.isArray(body.steps)
      ? body.steps.slice(0, 60).map((s: unknown) =>
          typeof s === "string"
            ? {
                // Konvensi "[foto]" di akhir baris = bukti foto wajib.
                item_text: s.replace(/\[foto\]/gi, "").trim(),
                requires_evidence: /\[foto\]/i.test(s),
              }
            : {
                item_text: String((s as { item_text?: string }).item_text || ""),
                is_required: (s as { is_required?: boolean }).is_required !== false,
                requires_evidence: Boolean((s as { requires_evidence?: boolean }).requires_evidence),
              },
        )
      : undefined;
    await createMilestone(
      workstreamId,
      {
        title: title.slice(0, 300),
        description: body.description ? String(body.description) : null,
        weight: Number(body.weight || 1),
        deadline: body.deadline ? String(body.deadline) : null,
        steps,
      },
      actorFromAuth(auth),
    );
    return ok({ created: true }, undefined, { status: 201 });
  } catch (error) {
    return projectFail(error, "Gagal membuat milestone");
  }
}

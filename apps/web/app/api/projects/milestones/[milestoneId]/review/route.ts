import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { reviewProjectMilestone } from "@/lib/services/project-pic.service";

export async function POST(
  request: Request,
  context: { params: Promise<{ milestoneId: string }> },
) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { milestoneId } = await context.params;
    const body = await request.json();
    const decision = String(body.decision || "").toUpperCase();
    if (decision !== "APPROVED" && decision !== "REVISION") {
      return fail("Keputusan validasi tidak valid");
    }

    await reviewProjectMilestone(milestoneId, {
      decision,
      note: body.note ? String(body.note) : null,
      reviewed_by: auth.session?.userId || null,
      reviewed_by_name: auth.session?.userName || "Owner/Leader",
    });

    return ok({ reviewed: true });
  } catch (error) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number((error as { status?: number }).status || 500)
        : 500;
    return fail(error instanceof Error ? error.message : "Gagal memvalidasi milestone", {
      status,
    });
  }
}

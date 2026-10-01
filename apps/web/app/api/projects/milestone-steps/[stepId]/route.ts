import { fail, ok, publicErrorMessage } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { deleteMilestoneStep } from "@/lib/services/project-pic.service";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ stepId: string }> },
) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { stepId } = await context.params;
    await deleteMilestoneStep(stepId);
    return ok({ deleted: true });
  } catch (error) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number((error as { status?: number }).status || 500)
        : 500;
    return fail(publicErrorMessage(error, "Gagal menghapus checklist"), {
      status,
    });
  }
}

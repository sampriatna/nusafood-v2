import { fail, ok } from "@/lib/api/response";
import {
  ProjectPicError,
  updateProjectPicStep,
} from "@/lib/services/project-pic.service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ stepId: string }> },
) {
  try {
    const { stepId } = await context.params;
    const body = await request.json();
    const token = String(body.token || "").trim();
    if (!token) return fail("Token project tidak valid", { status: 403 });

    return ok(
      await updateProjectPicStep(token, stepId, {
        ...(body.is_checked !== undefined
          ? { is_checked: Boolean(body.is_checked) }
          : {}),
        ...(body.note !== undefined
          ? { note: body.note ? String(body.note) : null }
          : {}),
        ...(body.evidence_url !== undefined
          ? {
              evidence_url: body.evidence_url
                ? String(body.evidence_url)
                : null,
            }
          : {}),
      }),
    );
  } catch (error) {
    if (error instanceof ProjectPicError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    return fail("Gagal memperbarui checklist", {
      code: "PROJECT_STEP_UPDATE_FAILED",
      status: 500,
    });
  }
}

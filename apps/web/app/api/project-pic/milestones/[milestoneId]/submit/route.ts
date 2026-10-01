import { fail, ok } from "@/lib/api/response";
import {
  ProjectPicError,
  submitProjectMilestone,
} from "@/lib/services/project-pic.service";

export async function POST(
  request: Request,
  context: { params: Promise<{ milestoneId: string }> },
) {
  try {
    const { milestoneId } = await context.params;
    const body = await request.json();
    const token = String(body.token || "").trim();
    if (!token) return fail("Token project tidak valid", { status: 403 });

    await submitProjectMilestone(token, milestoneId);
    return ok({ submitted: true });
  } catch (error) {
    if (error instanceof ProjectPicError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    return fail("Gagal mengajukan validasi", {
      code: "PROJECT_MILESTONE_SUBMIT_FAILED",
      status: 500,
    });
  }
}

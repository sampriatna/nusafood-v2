import { fail, ok } from "@/lib/api/response";
import { ProjectPicError, reportProjectBlocker } from "@/lib/services/project-pic.service";

export async function POST(request: Request, context: { params: Promise<{ milestoneId: string }> }) {
  try {
    const { milestoneId } = await context.params;
    const body = await request.json();
    const token = String(body.token || "").trim();
    if (!token) return fail("Link project tidak valid", { status: 403 });
    await reportProjectBlocker(token, { milestone_id: milestoneId, text: String(body.text || "") });
    return ok({ reported: true }, undefined, { status: 201 });
  } catch (error) {
    if (error instanceof ProjectPicError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    return fail("Gagal melaporkan kendala", { code: "PROJECT_BLOCKER_FAILED", status: 500 });
  }
}

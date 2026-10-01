import { fail, ok } from "@/lib/api/response";
import { ProjectPicError, resolveProjectPicBlocker } from "@/lib/services/project-pic.service";

export async function POST(request: Request, context: { params: Promise<{ blockerId: string }> }) {
  try {
    const { blockerId } = await context.params;
    const body = await request.json();
    const token = String(body.token || "").trim();
    if (!token) return fail("Link project tidak valid", { status: 403 });
    await resolveProjectPicBlocker(token, blockerId);
    return ok({ resolved: true });
  } catch (error) {
    if (error instanceof ProjectPicError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    return fail("Gagal memperbarui kendala", { code: "PROJECT_BLOCKER_FAILED", status: 500 });
  }
}

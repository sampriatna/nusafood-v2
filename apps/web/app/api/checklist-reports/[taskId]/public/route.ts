import { fail, ok } from "@/lib/api/response";
import { getChecklistByToken } from "@/lib/services/checklist.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ taskId: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { taskId } = await params;
    const token = new URL(request.url).searchParams.get("token");
    if (!token) {
      return fail("Token tidak valid", { code: "INVALID_TOKEN", status: 403 });
    }
    const data = await getChecklistByToken(taskId, token);
    if (!data) {
      return fail("Link checklist tidak valid", {
        code: "NOT_FOUND",
        status: 404,
      });
    }
    return ok(data);
  } catch (error) {
    console.error("[GET /api/checklist-reports/:id/public]", error);
    return fail("Gagal memuat checklist", { status: 500 });
  }
}

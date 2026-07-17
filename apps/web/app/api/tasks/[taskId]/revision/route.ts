import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  TaskWriteError,
  requestRevision,
} from "@/lib/services/task-write.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ taskId: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { taskId } = await params;
    const body = (await request.json()) as {
      revision_note?: string;
      verified_by?: string;
    };
    const task = await requestRevision(
      taskId,
      body.revision_note ?? "",
      body.verified_by,
    );
    return ok(task);
  } catch (error) {
    if (error instanceof TaskWriteError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/tasks/:id/revision]", error);
    return fail("Gagal meminta revisi", {
      code: "TASK_REVISION_FAILED",
      status: 500,
    });
  }
}

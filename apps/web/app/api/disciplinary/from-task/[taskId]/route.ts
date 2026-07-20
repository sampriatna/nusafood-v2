import { fail, ok } from "@/lib/api/response";
import {
  assertTaskOutletAccess,
  OutletAccessError,
} from "@/lib/outlet-scope";
import { requireAuth } from "@/lib/require-auth";
import {
  DisciplinaryError,
  buildPrefillFromTask,
} from "@/lib/services/disciplinary.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ taskId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  if (!auth.session) {
    return fail("Unauthorized", { code: "UNAUTHORIZED", status: 401 });
  }

  try {
    const { taskId } = await params;
    await assertTaskOutletAccess(auth.session, taskId);
    return ok(await buildPrefillFromTask(taskId));
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    if (error instanceof DisciplinaryError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[GET /api/disciplinary/from-task/:taskId]", error);
    return fail("Gagal membuat teguran dari task. Cek relasi task dan karyawan.", {
      code: "PREFILL_FAILED",
      status: 500,
    });
  }
}

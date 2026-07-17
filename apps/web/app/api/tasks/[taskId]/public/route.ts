import { fail, ok } from "@/lib/api/response";
import { getTaskByToken } from "@/lib/services/task.service";
import { checkGasFallback } from "@/lib/services/gas-adapter.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ taskId: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { taskId } = await params;
    const token = new URL(request.url).searchParams.get("token");

    if (!token) {
      return fail("Token tidak valid", {
        code: "INVALID_TOKEN",
        status: 403,
      });
    }

    const task = await getTaskByToken(taskId, token);
    if (task) {
      return ok(task);
    }

    // Fase 1–3: jika tidak ada di DB, catat bahwa GAS fallback tersedia
    // (implementasi fetch GAS penuh di Sprint 3/4).
    const gas = await checkGasFallback();
    if (gas === "ok" || gas === "degraded") {
      return fail(
        "Tugas belum ada di database v2. Fallback GAS akan diaktifkan di fase berikutnya.",
        {
          code: "GAS_FALLBACK_PENDING",
          status: 404,
        },
      );
    }

    return fail("Tugas tidak ditemukan", {
      code: "TASK_NOT_FOUND",
      status: 404,
    });
  } catch (error) {
    console.error("[GET /api/tasks/:taskId/public]", error);
    return fail("Gagal mengambil tugas publik", {
      code: "TASK_PUBLIC_FAILED",
      status: 500,
    });
  }
}

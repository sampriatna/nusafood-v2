import type { CreateTaskPayload } from "@nusafood/types";
import { fail, ok } from "@/lib/api/response";
import { listTasks } from "@/lib/services/task.service";
import { requireAuth } from "@/lib/require-auth";
import {
  TaskWriteError,
  createTask,
} from "@/lib/services/task-write.service";

export const dynamic = "force-dynamic";

function parseBool(value: string | null): boolean | undefined {
  if (value === null) return undefined;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return undefined;
}

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const result = await listTasks({
      outlet: searchParams.get("outlet") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      pic: searchParams.get("pic") ?? undefined,
      date_from: searchParams.get("date_from") ?? undefined,
      date_to: searchParams.get("date_to") ?? undefined,
      checklist_mode: parseBool(searchParams.get("checklist_mode")),
      page: Number(searchParams.get("page") ?? "1") || 1,
      limit: Number(searchParams.get("limit") ?? "50") || 50,
    });

    return ok(result.data, result.meta);
  } catch (error) {
    console.error("[GET /api/tasks]", error);
    return fail("Gagal mengambil daftar tugas", {
      code: "TASKS_LIST_FAILED",
      status: 500,
    });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as CreateTaskPayload;
    const task = await createTask(body);
    return ok(task, undefined, { status: 201 });
  } catch (error) {
    if (error instanceof TaskWriteError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/tasks]", error);
    return fail("Gagal membuat tugas", {
      code: "TASK_CREATE_FAILED",
      status: 500,
    });
  }
}


import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  TaskDraftError,
  generateTaskDraft,
  isAiConfigured,
  type TaskDraftInput,
} from "@/lib/ai/task-draft";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_FIELD = 2000;

function str(value: unknown, max = 200): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

/** Draft judul & deskripsi tugas dari catatan singkat admin. */
export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  if (!isAiConfigured()) {
    return fail("Fitur AI belum diaktifkan (ANTHROPIC_API_KEY belum diisi)", {
      code: "AI_NOT_CONFIGURED",
      status: 503,
    });
  }

  const limitKey = `ai-task-draft:${auth.session?.userId ?? getClientIp(request)}`;
  const limit = checkRateLimit(limitKey, 10);
  if (!limit.allowed) {
    return fail(`Terlalu sering. Coba lagi dalam ${limit.retryAfterSec} detik.`, {
      code: "RATE_LIMITED",
      status: 429,
    });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail("Body tidak valid", { code: "INVALID_BODY" });
  }

  const input: TaskDraftInput = {
    note: str(body.note, MAX_FIELD) ?? "",
    outlet: str(body.outlet),
    area: str(body.area),
    category: str(body.category),
    category_label: str(body.category_label),
    priority: str(body.priority),
    current_title: str(body.current_title),
    current_description: str(body.current_description, MAX_FIELD),
  };

  if (!input.note && !input.current_title && !input.current_description) {
    return fail("Tulis catatan singkat dulu, misalnya: hood dapur berminyak", {
      code: "NOTE_REQUIRED",
    });
  }
  if (!input.note) {
    input.note = input.current_title ?? "rapikan tugas di bawah";
  }

  try {
    const draft = await generateTaskDraft(input);
    return ok(draft);
  } catch (error) {
    if (error instanceof TaskDraftError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/ai/task-draft]", error);
    return fail("Gagal membuat draft AI", { code: "AI_DRAFT_FAILED", status: 500 });
  }
}

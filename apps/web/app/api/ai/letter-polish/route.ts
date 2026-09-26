import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { TaskDraftError, isAiConfigured } from "@/lib/ai/task-draft";
import { polishLetterText } from "@/lib/ai/letter-polish";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function str(value: unknown, max = 3000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Rapikan bahasa isi surat teguran/SP (fakta tidak diubah). */
export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  if (!isAiConfigured()) {
    return fail("Fitur AI belum diaktifkan (ANTHROPIC_API_KEY belum diisi)", {
      code: "AI_NOT_CONFIGURED",
      status: 503,
    });
  }

  const limit = checkRateLimit(
    `ai-letter-polish:${auth.session?.userId ?? getClientIp(request)}`,
    10,
  );
  if (!limit.allowed) {
    return fail(`Terlalu sering. Coba lagi dalam ${limit.retryAfterSec} detik.`, {
      code: "RATE_LIMITED",
      status: 429,
    });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const input = {
    letter_type: body.letter_type === "PERINGATAN" ? ("PERINGATAN" as const) : ("TEGURAN" as const),
    employee_name: str(body.employee_name, 200),
    task_title: str(body.task_title, 300),
    incident_date: str(body.incident_date, 40),
    chronology: str(body.chronology),
    violation_detail: str(body.violation_detail),
    operational_impact: str(body.operational_impact),
    correction_instruction: str(body.correction_instruction),
  };
  if (!input.chronology && !input.violation_detail && !input.operational_impact) {
    return fail("Isi kronologi / pelanggaran dulu", { code: "EMPTY" });
  }

  try {
    return ok(await polishLetterText(input));
  } catch (error) {
    if (error instanceof TaskDraftError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/ai/letter-polish]", error);
    return fail("Gagal merapikan bahasa surat", { code: "AI_POLISH_FAILED", status: 500 });
  }
}

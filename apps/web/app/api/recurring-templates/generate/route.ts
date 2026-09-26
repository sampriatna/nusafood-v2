import { fail, ok } from "@/lib/api/response";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import { generateRecurringTasks } from "@/lib/services/recurring-generate.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Mode auto (dipanggil saat admin buka dashboard) dibatasi agar tidak jalan berulang-ulang. */
const AUTO_COOLDOWN_MS = 3 * 60 * 1000;

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      mode?: "auto" | "manual";
      scheduled_date?: string;
      template_id?: string;
      force?: boolean;
      send_whatsapp?: boolean;
    };

    if (body.mode === "auto") {
      const recent = await prisma.syncLog.findFirst({
        where: {
          operation: "generate_recurring_batch",
          createdAt: { gte: new Date(Date.now() - AUTO_COOLDOWN_MS) },
        },
        select: { id: true },
      });
      if (recent) {
        return ok({ skipped: true, reason: "cooldown", created: 0 });
      }

      const result = await generateRecurringTasks({ force: false });
      return ok({
        ...result,
        created: result.results.filter((r) => r.status === "created").length,
      });
    }

    const result = await generateRecurringTasks({
      scheduled_date: body.scheduled_date,
      template_id: body.template_id,
      force: body.force ?? true,
      send_whatsapp: body.send_whatsapp,
    });

    return ok(result);
  } catch (error) {
    console.error("[POST /api/recurring-templates/generate]", error);
    return fail(
      error instanceof Error ? error.message : "Generate recurring gagal",
      { code: "RECURRING_GENERATE_FAILED", status: 500 },
    );
  }
}

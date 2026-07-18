import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { generateRecurringTasks } from "@/lib/services/recurring-generate.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      scheduled_date?: string;
      template_id?: string;
      force?: boolean;
      send_whatsapp?: boolean;
    };

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

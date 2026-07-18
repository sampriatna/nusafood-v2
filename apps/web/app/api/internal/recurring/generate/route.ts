import { fail, ok } from "@/lib/api/response";
import {
  internalAuthFailure,
  verifyInternalRequest,
} from "@/lib/internal-auth";
import { generateRecurringTasks } from "@/lib/services/recurring-generate.service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  if (!verifyInternalRequest(request)) {
    return internalAuthFailure();
  }
  return runGenerate(request);
}

export async function POST(request: Request) {
  if (!verifyInternalRequest(request)) {
    return internalAuthFailure();
  }
  return runGenerate(request);
}

async function runGenerate(request: Request) {
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
      force: body.force,
      send_whatsapp: body.send_whatsapp,
    });

    return ok(result);
  } catch (error) {
    console.error("[POST /api/internal/recurring/generate]", error);
    return fail(
      error instanceof Error ? error.message : "Generate recurring gagal",
      { code: "RECURRING_GENERATE_FAILED", status: 500 },
    );
  }
}

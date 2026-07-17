import { fail, ok } from "@/lib/api/response";
import { ChecklistError } from "@/lib/services/checklist.service";
import {
  createRecurringTemplate,
  listRecurringTemplates,
} from "@/lib/services/recurring.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await listRecurringTemplates();
    return ok(data, { total: data.length });
  } catch (error) {
    console.error("[GET /api/recurring-templates]", error);
    return fail("Gagal mengambil recurring templates", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await createRecurringTemplate(body);
    return ok(data, undefined, { status: 201 });
  } catch (error) {
    if (error instanceof ChecklistError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/recurring-templates]", error);
    return fail("Gagal membuat recurring template", { status: 500 });
  }
}

import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  OutletAccessError,
  assertCreateOutletAllowed,
  resolveListOutletFilter,
} from "@/lib/outlet-scope";
import {
  ChecklistError,
  createChecklistTemplate,
  listChecklistTemplates,
} from "@/lib/services/checklist.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const outlet = resolveListOutletFilter(
      auth.session!,
      new URL(request.url).searchParams.get("outlet"),
    );
    const data = await listChecklistTemplates(outlet);
    return ok(data, { total: data.length });
  } catch (error) {
    console.error("[GET /api/checklist-templates]", error);
    return fail("Gagal mengambil template checklist", {
      code: "CHECKLIST_TEMPLATES_FAILED",
      status: 500,
    });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    if (
      body &&
      typeof body === "object" &&
      "outlet" in body &&
      typeof body.outlet === "string"
    ) {
      assertCreateOutletAllowed(auth.session!, body.outlet);
    }
    const data = await createChecklistTemplate(body);
    return ok(data, undefined, { status: 201 });
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    if (error instanceof ChecklistError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/checklist-templates]", error);
    return fail("Gagal membuat template", { status: 500 });
  }
}

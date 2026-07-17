import { fail, ok } from "@/lib/api/response";
import { getRecurringTemplate } from "@/lib/services/recurring.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ templateId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { templateId } = await params;
    const data = await getRecurringTemplate(templateId);
    if (!data) {
      return fail("Template tidak ditemukan", { status: 404 });
    }
    return ok(data);
  } catch (error) {
    console.error("[GET /api/recurring-templates/:id]", error);
    return fail("Gagal mengambil template", { status: 500 });
  }
}

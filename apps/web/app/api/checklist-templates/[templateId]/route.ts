import { fail, ok } from "@/lib/api/response";
import { getChecklistTemplate } from "@/lib/services/checklist.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ templateId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { templateId } = await params;
    const data = await getChecklistTemplate(templateId);
    if (!data) {
      return fail("Template tidak ditemukan", {
        code: "NOT_FOUND",
        status: 404,
      });
    }
    return ok(data);
  } catch (error) {
    console.error("[GET /api/checklist-templates/:id]", error);
    return fail("Gagal mengambil template", { status: 500 });
  }
}

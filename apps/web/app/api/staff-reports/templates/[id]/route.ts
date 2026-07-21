import type {
  ReportTemplateCategory,
  ReportTemplateKind,
} from "@nusafood/types";
import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  DailyActivityError,
  getReportTemplateById,
  updateReportTemplate,
} from "@/lib/services/daily-activity.service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const template = await getReportTemplateById(id);
    if (!template) {
      return fail("Template tidak ditemukan", {
        code: "TEMPLATE_NOT_FOUND",
        status: 404,
      });
    }
    return ok(template);
  } catch (error) {
    console.error("[GET /api/staff-reports/templates/:id]", error);
    return fail("Gagal mengambil template", {
      code: "TEMPLATE_GET_FAILED",
      status: 500,
    });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const body = await request.json();

    const checklistItems = Array.isArray(body.checklist_items)
      ? body.checklist_items
          .map(
            (
              item: {
                item_text?: string;
                is_required?: boolean;
                sort_order?: number;
              },
              index: number,
            ) => ({
              item_text: String(item.item_text || "").trim(),
              is_required: item.is_required !== false,
              sort_order: item.sort_order ?? index + 1,
            }),
          )
          .filter((i: { item_text: string }) => i.item_text)
      : undefined;

    const template = await updateReportTemplate({
      id,
      title: body.title !== undefined ? String(body.title) : undefined,
      category:
        body.category !== undefined
          ? (body.category as ReportTemplateCategory)
          : undefined,
      description:
        body.description !== undefined ? String(body.description) : undefined,
      standard_result:
        body.standard_result !== undefined
          ? String(body.standard_result)
          : undefined,
      outlet_id:
        body.outlet_id === undefined
          ? undefined
          : body.outlet_id === "" || body.outlet_id === "ALL"
            ? null
            : String(body.outlet_id),
      position_group:
        body.position_group === undefined
          ? undefined
          : body.position_group === "" || body.position_group === "ALL"
            ? null
            : String(body.position_group),
      requires_photo:
        body.requires_photo !== undefined
          ? Boolean(body.requires_photo)
          : undefined,
      is_required_daily:
        body.is_required_daily !== undefined
          ? Boolean(body.is_required_daily)
          : undefined,
      kind:
        body.kind !== undefined
          ? (body.kind as ReportTemplateKind)
          : undefined,
      target_time_start:
        body.target_time_start !== undefined
          ? body.target_time_start
            ? String(body.target_time_start)
            : null
          : undefined,
      target_time_end:
        body.target_time_end !== undefined
          ? body.target_time_end
            ? String(body.target_time_end)
            : null
          : undefined,
      active: body.active !== undefined ? Boolean(body.active) : undefined,
      sort_order:
        body.sort_order !== undefined ? Number(body.sort_order) : undefined,
      checklist_items: checklistItems,
    });

    return ok(template);
  } catch (error) {
    if (error instanceof DailyActivityError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[PATCH /api/staff-reports/templates/:id]", error);
    return fail("Gagal update template", {
      code: "TEMPLATE_UPDATE_FAILED",
      status: 500,
    });
  }
}

import type { ReportTemplateCategory, ReportTemplateKind } from "@nusafood/types";
import {
  listReportTemplates,
  createReportTemplate,
} from "@/lib/staff-report-store";
import { ensureStaffReportCache } from "@/lib/ensure-staff-report-cache";
import { requireAuth } from "@/lib/require-auth";
import { ok, fail } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureStaffReportCache();
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  return ok(listReportTemplates());
}

export async function POST(request: Request) {
  await ensureStaffReportCache();
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    if (!body.title || !String(body.title).trim()) {
      return fail("Nama kegiatan wajib diisi", { status: 400 });
    }

    const checklistItems = Array.isArray(body.checklist_items)
      ? body.checklist_items
          .map(
            (
              item: { item_text?: string; is_required?: boolean; sort_order?: number },
              index: number,
            ) => ({
              item_text: String(item.item_text || "").trim(),
              is_required: item.is_required !== false,
              sort_order: item.sort_order ?? index + 1,
            }),
          )
          .filter((i: { item_text: string }) => i.item_text)
      : [];

    const template = createReportTemplate({
      title: String(body.title),
      category: (body.category as ReportTemplateCategory) || "General",
      description: body.description ? String(body.description) : "",
      standard_result: body.standard_result
        ? String(body.standard_result)
        : body.description
          ? String(body.description)
          : "",
      outlet_id:
        body.outlet_id === undefined || body.outlet_id === "" || body.outlet_id === "ALL"
          ? null
          : String(body.outlet_id),
      position_group:
        body.position_group === undefined ||
        body.position_group === "" ||
        body.position_group === "ALL"
          ? null
          : String(body.position_group),
      requires_photo: Boolean(body.requires_photo),
      is_required_daily: Boolean(body.is_required_daily),
      kind: (body.kind as ReportTemplateKind) || undefined,
      target_time_start: body.target_time_start ? String(body.target_time_start) : null,
      target_time_end: body.target_time_end ? String(body.target_time_end) : null,
      active: body.active !== false,
      sort_order: Number(body.sort_order ?? 10),
      checklist_items: checklistItems,
    });

    return ok(template);
  } catch {
    return fail("Invalid request body", { status: 400 });
  }
}

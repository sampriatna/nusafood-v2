import type {
  ChecklistItem as DbItem,
  ChecklistReport as DbReport,
  ChecklistTemplate as DbTemplate,
  Area,
  Outlet,
  ChecklistReportItem as DbReportItem,
} from "@nusafood/database";
import type {
  ChecklistItem,
  ChecklistReport,
  ChecklistReportItem,
  ChecklistReportStatus,
  ChecklistTemplate,
} from "@nusafood/types";

type TemplateWithRelations = DbTemplate & {
  outlet?: Outlet | null;
  area?: Area | null;
  items?: DbItem[];
};

type ReportWithRelations = DbReport & {
  outlet?: Outlet | null;
  area?: Area | null;
  template?: TemplateWithRelations | null;
  items?: (DbReportItem & { item?: DbItem | null })[];
};

export function mapChecklistItem(item: DbItem): ChecklistItem {
  return {
    checklist_item_id: item.checklistItemId,
    template_id: item.templateId,
    item_order: item.itemOrder,
    item_text: item.itemText,
    requires_photo: item.requiresPhoto,
    is_required: item.isRequired,
    active_status: item.activeStatus,
  };
}

export function mapChecklistTemplate(
  template: TemplateWithRelations,
): ChecklistTemplate {
  return {
    template_id: template.templateId,
    template_name: template.templateName,
    outlet: template.outlet?.code ?? template.outlet?.name ?? "",
    area: template.area?.name ?? "",
    items: (template.items ?? [])
      .slice()
      .sort((a, b) => a.itemOrder - b.itemOrder)
      .map(mapChecklistItem),
    created_at: template.createdAt.toISOString(),
    updated_at: template.updatedAt.toISOString(),
  };
}

export function mapChecklistReport(
  report: ReportWithRelations,
): ChecklistReport {
  const templateItems = (report.template?.items ?? [])
    .slice()
    .sort((a, b) => a.itemOrder - b.itemOrder)
    .map(mapChecklistItem);

  const checked: ChecklistReportItem[] = (report.items ?? []).map((row) => ({
    checklist_item_id: row.checklistItemId,
    is_checked: row.isChecked,
    photo_url: row.photoUrl ?? undefined,
  }));

  return {
    report_id: report.reportId,
    task_id: report.taskId ?? "",
    template_id: report.templateId,
    token: report.token,
    pic_name: report.picName,
    pic_wa: report.picWa,
    outlet: report.outlet?.code ?? report.outlet?.name ?? "",
    area: report.area?.name ?? "",
    report_date: report.reportDate.toISOString().slice(0, 10),
    deadline: report.deadline.toISOString(),
    checklist_title:
      report.checklistTitle ?? report.template?.checklistTitle ?? "",
    items: templateItems,
    submitted_at: report.submittedAt?.toISOString(),
    checked_items: checked,
    after_photo_url: report.afterPhotoUrl ?? undefined,
    staff_note: report.staffNote ?? undefined,
    status: report.status as ChecklistReportStatus,
    verified_by: report.verifiedBy ?? undefined,
    verified_at: report.verifiedAt?.toISOString(),
    revision_note: report.revisionNote ?? undefined,
    revision_count: report.revisionCount,
    is_late: report.isLate,
  };
}

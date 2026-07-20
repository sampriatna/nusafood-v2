import type {
  DailyReportChecklistAnswer,
  DailyReportSubmission,
  ReportTemplate,
  ReportTemplateChecklistItem,
  StaffReportLink,
} from "@nusafood/types";
import type {
  DailyReportSubmission as DbSubmission,
  Outlet,
  ReportTemplate as DbTemplate,
  ReportTemplateChecklistItem as DbItem,
  Staff,
  StaffReportLink as DbLink,
} from "@nusafood/database";

type TemplateWithRelations = DbTemplate & {
  outlet?: Outlet | null;
  items?: DbItem[];
};

type LinkWithStaff = DbLink & {
  staff?: (Staff & { outlet?: Outlet | null }) | null;
};

type SubmissionWithRelations = DbSubmission & {
  staff?: (Staff & { outlet?: Outlet | null }) | null;
  outlet?: Outlet | null;
  template?: TemplateWithRelations | null;
  answers?: {
    id: string;
    submissionId: string;
    checklistItemId: string;
    checked: boolean;
    createdAt: Date;
    item?: DbItem | null;
  }[];
};

function formatTime(value: Date | null | undefined): string | null {
  if (!value) return null;
  const hh = String(value.getUTCHours()).padStart(2, "0");
  const mm = String(value.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function mapChecklistItem(
  item: DbItem,
): ReportTemplateChecklistItem {
  return {
    id: item.id,
    report_template_id: item.reportTemplateId,
    item_text: item.itemText,
    is_required: item.isRequired,
    sort_order: item.sortOrder,
    created_at: item.createdAt.toISOString(),
  };
}

export function mapReportTemplate(
  template: TemplateWithRelations,
): ReportTemplate {
  return {
    id: template.id,
    code: template.code,
    title: template.title,
    category: template.category,
    outlet_id: template.outlet?.code ?? null,
    position_group: template.positionGroup,
    standard_result: template.standardResult,
    description: template.description ?? template.standardResult,
    requires_photo: template.requiresPhoto,
    is_required_daily: template.isRequiredDaily,
    kind: template.kind,
    target_time_start: formatTime(template.targetTimeStart),
    target_time_end: formatTime(template.targetTimeEnd),
    active: template.active,
    sort_order: template.sortOrder,
    created_at: template.createdAt.toISOString(),
    checklist_items: (template.items ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(mapChecklistItem),
  };
}

export function mapStaffReportLink(
  link: LinkWithStaff,
  origin = "",
): StaffReportLink {
  const staff = link.staff;
  return {
    id: link.id,
    staff_id: link.staffId,
    token: link.token,
    short_code: link.shortCode,
    is_active: link.isActive,
    created_at: link.createdAt.toISOString(),
    revoked_at: link.revokedAt?.toISOString() ?? null,
    staff_name: staff?.name,
    outlet: staff?.outlet?.code ?? staff?.outlet?.name,
    position: staff?.position ?? undefined,
    report_url: origin ? `${origin}/r/${link.shortCode}` : `/r/${link.shortCode}`,
    report_url_long: origin ? `${origin}/r/${link.token}` : `/r/${link.token}`,
  };
}

export function mapDailySubmission(
  sub: SubmissionWithRelations,
): DailyReportSubmission {
  const answers: DailyReportChecklistAnswer[] = (sub.answers ?? []).map((a) => ({
    id: a.id,
    submission_id: a.submissionId,
    checklist_item_id: a.checklistItemId,
    checked: a.checked,
    created_at: a.createdAt.toISOString(),
    item_text: a.item?.itemText,
  }));
  const total = answers.length;
  const checked = answers.filter((a) => a.checked).length;
  const outletCode =
    sub.outlet?.code ??
    sub.staff?.outlet?.code ??
    sub.outlet?.name ??
    "";

  return {
    id: sub.id,
    staff_id: sub.staffId,
    outlet_id: outletCode,
    report_template_id: sub.reportTemplateId,
    report_date: sub.reportDate.toISOString().slice(0, 10),
    status_condition: sub.statusCondition,
    note: sub.note ?? "",
    photo_url: sub.photoUrl,
    submitted_at: sub.submittedAt.toISOString(),
    created_at: sub.createdAt.toISOString(),
    checklist_answers: answers,
    checklist_total: total,
    checklist_checked: checked,
    checklist_percent: total > 0 ? Math.round((checked / total) * 100) : 0,
    staff_name: sub.staff?.name,
    outlet: outletCode,
    report_title: sub.template?.title,
    position: sub.staff?.position ?? undefined,
  };
}

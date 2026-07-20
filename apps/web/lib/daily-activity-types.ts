import type { Staff } from "@nusafood/types";

export type ReportConditionStatus =
  | "aman"
  | "kendala_ringan"
  | "follow_up_leader"
  | "perlu_belanja";

export type ReportTemplateCategory =
  | "Cleaning"
  | "Opening"
  | "Closing"
  | "Stock"
  | "Production"
  | "Maintenance"
  | "Kendala"
  | "Special"
  | "General";

export type ReportTemplateKind =
  | "daily_required"
  | "issue_quick"
  | "special_task";

export type ReportPositionGroup =
  | "Waiters"
  | "Bar"
  | "Dapur"
  | "PA"
  | "OB"
  | "Klindingan"
  | string;

export const REPORT_CONDITION_OPTIONS: Array<{
  value: ReportConditionStatus;
  label: string;
  requiresNote: boolean;
}> = [
  { value: "aman", label: "Aman", requiresNote: false },
  {
    value: "kendala_ringan",
    label: "Kendala ringan",
    requiresNote: true,
  },
  {
    value: "follow_up_leader",
    label: "Follow up leader",
    requiresNote: true,
  },
  {
    value: "perlu_belanja",
    label: "Perlu belanja/perbaikan",
    requiresNote: true,
  },
];

export const REPORT_POSITION_GROUPS = [
  "Waiters",
  "Bar",
  "Dapur",
  "PA",
  "OB",
  "Klindingan",
] as const;

export type DailyReportStaff = Staff & {
  position_group?: string | null;
};

export type ReportChecklistItem = {
  id: string;
  item_text: string;
  is_required: boolean;
  sort_order?: number | null;
};

export interface ReportTemplate {
  id: string;
  title: string;
  category: ReportTemplateCategory | string;
  description: string;
  standard_result: string;
  outlet_id?: string | null;
  position_group?: ReportPositionGroup | null;
  requires_photo: boolean;
  is_required_daily: boolean;
  kind: ReportTemplateKind | string;
  target_time_start?: string | null;
  target_time_end?: string | null;
  active: boolean;
  sort_order: number;
  checklist_items?: ReportChecklistItem[];
  created_at?: string;
  updated_at?: string;
}

export interface StaffReportLink {
  id: string;
  staff_id: string;
  token: string;
  short_code?: string | null;
  report_url?: string | null;
  is_active: boolean;
  staff_name?: string | null;
  outlet?: string | null;
  position?: string | null;
  position_group?: string | null;
  created_at?: string;
  revoked_at?: string | null;
}

export interface DailyReportChecklistAnswer {
  checklist_item_id: string;
  checked: boolean;
}

export interface DailyReportSubmission {
  id: string;
  staff_id: string;
  report_template_id: string;
  report_date?: string;
  status_condition: ReportConditionStatus;
  note?: string | null;
  photo_url?: string | null;
  checklist_answers?: DailyReportChecklistAnswer[];
  checklist_checked?: number | null;
  checklist_total?: number | null;
  checklist_percent?: number | null;
  submitted_at?: string;
}

export type DailyReportRowLabel =
  | "selesai_lengkap"
  | "selesai_kendala"
  | "belum_submit"
  | "tidak_wajib"
  | "perlu_perbaikan";

export interface DailyReportDashboardRow {
  staff_id: string;
  staff_name: string;
  outlet: string;
  position: string;
  position_group?: string | null;
  report_template_id: string;
  report_title: string;
  is_required_daily: boolean;
  submitted: boolean;
  submitted_at?: string | null;
  status_condition?: ReportConditionStatus | null;
  note?: string | null;
  photo_url?: string | null;
  checklist_checked: number;
  checklist_total: number;
  checklist_percent: number;
  label: DailyReportRowLabel;
}

export interface DailyReportMissingRequired {
  staff_id: string;
  staff_name: string;
  outlet: string;
  report_template_id: string;
  report_title: string;
}

export interface DailyReportDashboardData {
  summary: {
    total_today: number;
    complete_ok: number;
    complete_with_issue: number;
    not_submitted: number;
    staff_submitted: number;
    staff_not_submitted: number;
  };
  rows: DailyReportDashboardRow[];
  missing_required: DailyReportMissingRequired[];
}

export type DailyActivityApiResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

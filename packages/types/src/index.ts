/** Shared domain types for Nusa Food Task System v2 */

export type TaskStatus =
  | "CREATED"
  | "SENT"
  | "WA_FAILED"
  | "OPEN"
  | "OPENED"
  | "SUBMITTED"
  | "RESUBMITTED"
  | "WAITING_VERIFICATION"
  | "DONE"
  | "VERIFIED"
  | "REVISI"
  | "REVISION"
  | "REVISION_REQUESTED"
  | "LATE";

export type TaskPriority = "Low" | "Medium" | "High" | "Urgent";

/** Legacy outlet display names from v1 */
export type Outlet = "KBU" | "Kisamen" | "Samtaro Express";

/** Outlet codes used in v2 DB */
export type OutletCode = "KBU" | "KISAMEN" | "SAMTARO";

export type Area =
  | "Dapur"
  | "Bar"
  | "Floor"
  | "Gudang"
  | "Toilet"
  | "Outdoor"
  | "Maintenance"
  | "Kebon"
  | "Kasir";

export type Category =
  | "Cleaning"
  | "Maintenance"
  | "Stock"
  | "Kitchen"
  | "Bar"
  | "Floor"
  | "Waste"
  | "General";

export type StaffRole = "STAFF" | "LEADER" | "ADMIN";
export type StaffStatus = "ACTIVE" | "INACTIVE";
export type RepeatType = "daily" | "weekdays" | "weekly" | "monthly" | "custom";
export type DayOfWeek =
  | "senin"
  | "selasa"
  | "rabu"
  | "kamis"
  | "jumat"
  | "sabtu"
  | "minggu";
export type ChecklistReportStatus =
  | "OPEN"
  | "SUBMITTED"
  | "DONE"
  | "REVISI"
  | "LATE";

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  error: null;
  meta?: ApiMeta;
}

export interface ApiErrorResponse {
  success: false;
  data: null;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface Task {
  task_id: string;
  token: string;
  created_at: string;
  created_by: string;
  outlet: Outlet | string;
  area: Area | string;
  category: Category | string;
  task_title: string;
  task_description: string;
  priority: TaskPriority;
  pic_name: string;
  pic_wa: string;
  staff_id?: string;
  deadline: string;
  before_photo_url?: string;
  status: TaskStatus;
  report_link: string;
  wa_sent_at?: string;
  opened_at?: string;
  submitted_at?: string;
  after_photo_url?: string;
  staff_note?: string;
  leader_verification?: string;
  verified_by?: string;
  verified_at?: string;
  final_status?: string;
  is_late: boolean;
  duration_minutes?: number;
  last_updated: string;
  checklist_mode?: boolean;
  source_version?: "v1" | "v2";
}

export interface CreateTaskPayload {
  outlet: Outlet | OutletCode | string;
  area: Area | string;
  category: Category | string;
  task_title: string;
  task_description: string;
  priority: TaskPriority;
  pic_name: string;
  pic_wa: string;
  deadline: string;
  before_photo_base64?: string;
  before_photo_url?: string;
}

export interface SubmitReportPayload {
  task_id: string;
  token: string;
  after_photo_base64?: string;
  after_photo_url?: string;
  staff_note?: string;
}

export interface TaskFilters {
  outlet?: string;
  status?: TaskStatus | string;
  pic?: string;
  date_from?: string;
  date_to?: string;
  checklist_mode?: boolean;
  page?: number;
  limit?: number;
}

export interface DashboardSummary {
  total: number;
  open: number;
  submitted: number;
  done: number;
  late: number;
  revisi: number;
}

export interface ChecklistSummary {
  total: number;
  open: number;
  submitted: number;
  done: number;
  late: number;
  revisi: number;
}

export interface FullDashboardSummary {
  tasks: DashboardSummary;
  checklists: ChecklistSummary;
}

export interface Staff {
  staff_id: string;
  name: string;
  position: string;
  outlet: Outlet | string;
  area: Area | string;
  wa_number: string;
  role: StaffRole;
  status: StaffStatus;
  login_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateStaffPayload {
  name: string;
  position: string;
  outlet: Outlet | OutletCode | string;
  area: Area | string;
  wa_number: string;
  role: StaffRole;
}

export interface UpdateStaffPayload extends CreateStaffPayload {
  staff_id: string;
  login_enabled?: boolean;
}

export interface RecurringTemplate {
  template_id: string;
  template_name: string;
  outlet: Outlet | string;
  area: Area | string;
  category: Category | string;
  pic_name: string;
  pic_wa: string;
  staff_id?: string;
  task_title: string;
  task_description: string;
  repeat_type: RepeatType;
  repeat_days: DayOfWeek[];
  repeat_time: string;
  deadline_time: string;
  requires_photo: boolean;
  active_status: boolean;
  template_version: number;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  checklist_item_id: string;
  template_id: string;
  item_order: number;
  item_text: string;
  requires_photo: boolean;
  is_required: boolean;
  active_status: boolean;
}

export interface ChecklistTemplate {
  template_id: string;
  template_name: string;
  outlet: Outlet | string;
  area: Area | string;
  items: ChecklistItem[];
  created_at: string;
  updated_at: string;
}

export interface ChecklistReportItem {
  checklist_item_id: string;
  is_checked: boolean;
  photo_url?: string;
}

export interface ChecklistReport {
  report_id: string;
  task_id: string;
  template_id: string;
  token: string;
  pic_name: string;
  pic_wa: string;
  outlet: Outlet | string;
  area: Area | string;
  report_date: string;
  deadline: string;
  checklist_title: string;
  items: ChecklistItem[];
  submitted_at?: string;
  checked_items: ChecklistReportItem[];
  after_photo_url?: string;
  staff_note?: string;
  status: ChecklistReportStatus;
  verified_by?: string;
  verified_at?: string;
  revision_note?: string;
  revision_count: number;
  is_late: boolean;
}

export interface UserLogin {
  user_id: string;
  staff_id: string;
  username: string;
  role: StaffRole;
  outlet?: string;
  name?: string;
  wa_number?: string;
  login_enabled: boolean;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
}

export interface LeaderSession {
  staff_id: string;
  name: string;
  wa_number: string;
  outlet: Outlet | string;
  role: StaffRole;
  login_time: number;
}

export interface HealthStatus {
  version: string;
  database: "ok" | "degraded" | "down";
  storage: "ok" | "degraded" | "down" | "skipped";
  gas_fallback: "ok" | "degraded" | "down" | "disabled";
}

/* ─── Daily Activity SOP (staff static report link) ─── */

export type ReportConditionStatus =
  | "aman"
  | "kendala_ringan"
  | "follow_up_leader"
  | "perlu_belanja";

/** Validasi laporan staff oleh leader (cek fisik) */
export type StaffReportValidationStatus =
  | "valid"
  | "revisi"
  | "tidak_valid"
  | "manipulasi";

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
  | "special_task"
  | "issue_quick";

export interface StaffReportLink {
  id: string;
  staff_id: string;
  token: string;
  short_code: string;
  is_active: boolean;
  created_at: string;
  revoked_at?: string | null;
  staff_name?: string;
  outlet?: Outlet | string;
  position?: string;
  report_url?: string;
  report_url_long?: string;
}

export interface ReportTemplateChecklistItem {
  id: string;
  report_template_id: string;
  item_text: string;
  is_required: boolean;
  sort_order: number;
  created_at: string;
}

export interface ReportTemplate {
  id: string;
  code?: string;
  title: string;
  category: ReportTemplateCategory | string;
  /** Outlet code e.g. "KBU", null = semua outlet */
  outlet_id: string | null;
  position_group: string | null;
  standard_result: string;
  description: string;
  requires_photo: boolean;
  is_required_daily: boolean;
  kind: ReportTemplateKind;
  target_time_start?: string | null;
  target_time_end?: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  checklist_items?: ReportTemplateChecklistItem[];
}

export interface CreateReportTemplatePayload {
  title: string;
  category?: ReportTemplateCategory | string;
  outlet_id?: string | null;
  position_group?: string | null;
  standard_result?: string;
  description?: string;
  requires_photo?: boolean;
  is_required_daily?: boolean;
  kind?: ReportTemplateKind;
  target_time_start?: string | null;
  target_time_end?: string | null;
  active?: boolean;
  sort_order?: number;
  checklist_items?: { item_text: string; is_required?: boolean; sort_order?: number }[];
}

export interface UpdateReportTemplatePayload {
  id: string;
  title?: string;
  category?: ReportTemplateCategory | string;
  outlet_id?: string | null;
  position_group?: string | null;
  standard_result?: string;
  description?: string;
  requires_photo?: boolean;
  is_required_daily?: boolean;
  kind?: ReportTemplateKind;
  target_time_start?: string | null;
  target_time_end?: string | null;
  active?: boolean;
  sort_order?: number;
  checklist_items?: { item_text: string; is_required?: boolean; sort_order?: number }[];
}

export interface DailyReportChecklistAnswer {
  id: string;
  submission_id: string;
  checklist_item_id: string;
  checked: boolean;
  created_at: string;
  item_text?: string;
}

export interface DailyReportSubmission {
  id: string;
  staff_id: string;
  outlet_id: string;
  report_template_id: string;
  report_date: string;
  status_condition: ReportConditionStatus;
  note: string;
  photo_url?: string | null;
  submitted_at: string;
  created_at: string;
  checklist_answers?: DailyReportChecklistAnswer[];
  /** Validasi leader — null = belum dicek fisik */
  leader_validation?: StaffReportValidationStatus | null;
  leader_validation_note?: string | null;
  leader_validated_at?: string | null;
  leader_validated_by?: string | null;
  leader_validated_by_name?: string | null;
  leader_validation_photo_url?: string | null;
  staff_name?: string;
  outlet?: string;
  report_title?: string;
  position?: string;
  checklist_total?: number;
  checklist_checked?: number;
  checklist_percent?: number;
}

export interface SubmitDailyReportPayload {
  token: string;
  report_template_id: string;
  status_condition: ReportConditionStatus;
  note?: string;
  photo_url?: string | null;
  photo_base64?: string;
  checklist_answers: { checklist_item_id: string; checked: boolean }[];
}

export interface KendalaNotifyInfo {
  needed: boolean;
  gas_sent: boolean;
  gas_error?: string;
  leaders: {
    staff_id: string;
    name: string;
    wa_number: string;
    outlet: string;
    wa_link: string;
  }[];
  message: string;
}

export interface StaffReportLinkContext {
  link: StaffReportLink;
  staff: {
    staff_id: string;
    name: string;
    outlet: string;
    position: string;
    position_group: string;
  };
  templates: ReportTemplate[];
  today_submissions: DailyReportSubmission[];
}

export interface DailyReportFilters {
  date?: string;
  outlet?: string;
  staff_id?: string;
  report_template_id?: string;
  submit_status?: "submitted" | "not_submitted" | "all";
}

export interface DailyReportDashboardSummary {
  total_today: number;
  staff_submitted: number;
  staff_not_submitted: number;
  reports_with_issue: number;
  complete_ok: number;
  complete_with_issue: number;
  not_submitted: number;
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
  report_template_id: string;
  report_title: string;
  category?: string;
  is_required_daily: boolean;
  submitted: boolean;
  submission?: DailyReportSubmission | null;
  submitted_at?: string | null;
  photo_url?: string | null;
  note?: string | null;
  status_condition?: ReportConditionStatus | null;
  checklist_total: number;
  checklist_checked: number;
  checklist_percent: number;
  label: DailyReportRowLabel;
}

export interface DailyReportDashboardData {
  summary: DailyReportDashboardSummary;
  rows: DailyReportDashboardRow[];
  submissions: DailyReportSubmission[];
  missing_required: DailyReportDashboardRow[];
}

export const REPORT_CONDITION_OPTIONS: {
  value: ReportConditionStatus;
  label: string;
  requiresNote: boolean;
}[] = [
  { value: "aman", label: "Aman", requiresNote: false },
  { value: "kendala_ringan", label: "Ada kendala ringan", requiresNote: true },
  { value: "follow_up_leader", label: "Perlu follow up leader", requiresNote: true },
  { value: "perlu_belanja", label: "Perlu belanja/perbaikan", requiresNote: true },
];

export const REPORT_POSITION_GROUPS = ["Waiters", "Bar", "Dapur", "PA"] as const;

/* ─── Leader Monitoring (kontrol lapangan di atas Daily Report) ─── */

export type LeaderMonitorKind =
  | "opening_control"
  | "jam_ramai_control"
  | "spot_check_area"
  | "closing_control"
  | "issue_log";

export type LeaderMonitorStatus = "aman" | "ada_catatan" | "tidak_sesuai";

export type LeaderItemScore = 0 | 1 | 2;

export type LeaderFollowUpStatus = "open" | "on_progress" | "selesai";

export type LeaderPhotoMode = "required" | "optional" | "required_if_issue";

export interface LeaderMonitorChecklistItem {
  id: string;
  item_text: string;
  sort_order: number;
}

export interface LeaderMonitorTemplate {
  id: string;
  kind: LeaderMonitorKind;
  title: string;
  menu_label: string;
  description: string;
  standard_result: string;
  outlet_id: string | null;
  target_time_start?: string | null;
  target_time_end?: string | null;
  photo_mode: LeaderPhotoMode;
  checklist: LeaderMonitorChecklistItem[];
  active: boolean;
  sort_order: number;
}

export interface LeaderMonitorChecklistScore {
  item_id: string;
  score: LeaderItemScore;
  item_text?: string;
}

export interface LeaderMonitorSubmission {
  id: string;
  template_id: string;
  kind: LeaderMonitorKind;
  report_date: string;
  outlet_id: string;
  shift: string;
  leader_id: string;
  leader_name: string;
  area: string;
  status: LeaderMonitorStatus;
  score_total: number;
  score_max: number;
  checklist_scores: LeaderMonitorChecklistScore[];
  related_staff_ids: string[];
  related_staff_names: string;
  problem_note: string;
  fix_instruction: string;
  fix_deadline?: string | null;
  photo_url?: string | null;
  follow_up_status: LeaderFollowUpStatus;
  staff_submission_id?: string | null;
  staff_validation?: StaffReportValidationStatus | null;
  created_at: string;
  updated_at: string;
  title?: string;
}

export interface SubmitLeaderMonitorPayload {
  template_id: string;
  outlet_id: string;
  shift?: string;
  leader_id?: string;
  leader_name?: string;
  area?: string;
  status: LeaderMonitorStatus;
  checklist_scores: { item_id: string; score: LeaderItemScore }[];
  related_staff_ids?: string[];
  related_staff_names?: string;
  problem_note?: string;
  fix_instruction?: string;
  fix_deadline?: string | null;
  photo_base64?: string;
  follow_up_status?: LeaderFollowUpStatus;
  staff_submission_id?: string | null;
  staff_validation?: StaffReportValidationStatus | null;
  report_date?: string;
}

export interface ValidateStaffReportPayload {
  submission_id: string;
  validation: StaffReportValidationStatus;
  note?: string;
  leader_id?: string;
  leader_name?: string;
  photo_base64?: string;
}

export interface LeaderMonitorFilters {
  date?: string;
  outlet?: string;
  kind?: LeaderMonitorKind | "ALL";
  follow_up?: LeaderFollowUpStatus | "ALL";
}

export interface LeaderMonitorDashboardSummary {
  total_today: number;
  area_aman: number;
  area_bermasalah: number;
  staff_perlu_perbaikan: number;
  issue_open: number;
  issue_selesai: number;
  staff_revisi_count: number;
}

export interface LeaderMonitorDashboardData {
  summary: LeaderMonitorDashboardSummary;
  templates: LeaderMonitorTemplate[];
  submissions: LeaderMonitorSubmission[];
  staff_need_fix: DailyReportSubmission[];
}

export const LEADER_MONITOR_KIND_META: {
  kind: LeaderMonitorKind;
  label: string;
  short: string;
}[] = [
  { kind: "opening_control", label: "Opening Control", short: "Opening" },
  { kind: "jam_ramai_control", label: "Jam Ramai Control", short: "Jam Ramai" },
  { kind: "spot_check_area", label: "Spot Check Area", short: "Spot Check" },
  { kind: "closing_control", label: "Closing Control", short: "Closing" },
  {
    kind: "issue_log",
    label: "Issue Log / Catatan Masalah",
    short: "Issue Log",
  },
];

export const LEADER_MONITOR_STATUS_OPTIONS: {
  value: LeaderMonitorStatus;
  label: string;
  color: string;
}[] = [
  { value: "aman", label: "Aman / Siap", color: "green" },
  { value: "ada_catatan", label: "Ada catatan", color: "yellow" },
  {
    value: "tidak_sesuai",
    label: "Tidak sesuai / belum siap",
    color: "red",
  },
];

export const LEADER_ITEM_SCORE_OPTIONS: {
  value: LeaderItemScore;
  label: string;
}[] = [
  { value: 2, label: "Aman" },
  { value: 1, label: "Catatan" },
  { value: 0, label: "Gagal" },
];

/** @deprecated use LEADER_ITEM_SCORE_OPTIONS */
export const LEADER_SCORE_OPTIONS = LEADER_ITEM_SCORE_OPTIONS;

export const STAFF_REPORT_VALIDATION_OPTIONS: {
  value: StaffReportValidationStatus;
  label: string;
}[] = [
  { value: "valid", label: "Valid — sesuai lapangan" },
  { value: "revisi", label: "Revisi — staff wajib ulang" },
  { value: "tidak_valid", label: "Tidak valid" },
  { value: "manipulasi", label: "Diduga manipulasi" },
];

/** @deprecated use STAFF_REPORT_VALIDATION_OPTIONS */
export const STAFF_VALIDATION_OPTIONS = STAFF_REPORT_VALIDATION_OPTIONS;

export const LEADER_FOLLOW_UP_OPTIONS: {
  value: LeaderFollowUpStatus;
  label: string;
}[] = [
  { value: "open", label: "Open" },
  { value: "on_progress", label: "On Progress" },
  { value: "selesai", label: "Selesai" },
];

export const LEADER_SHIFTS = ["Pagi", "Siang", "Malam"] as const;

/* ─── Teguran Center / Disciplinary Letters ─── */

export type DisciplinaryLetterType = "TEGURAN" | "PERINGATAN";
export type DisciplinaryLetterLevel = 1 | 2 | 3;
export type DisciplinaryLetterStatus =
  | "DRAFT"
  | "WAITING_APPROVAL"
  | "APPROVED"
  | "SENT"
  | "ACKNOWLEDGED"
  | "RESOLVED"
  | "CANCELLED";

export type DisciplinarySourceType =
  | "TASK_LATE"
  | "TASK_INCOMPLETE"
  | "FAKE_REPORT"
  | "SOP_VIOLATION"
  | "ATTENDANCE"
  | "ATTITUDE"
  | "OTHER";

export type DisciplinaryEvidenceType =
  | "PHOTO"
  | "SCREENSHOT"
  | "TASK_REPORT"
  | "NOTE"
  | "FILE"
  | "LINK";

export interface DisciplinaryEvidence {
  id: string;
  disciplinary_letter_id: string;
  evidence_type: DisciplinaryEvidenceType;
  file_url?: string | null;
  text_note?: string | null;
  related_task_photo_id?: string | null;
  created_by: string;
  created_at: string;
}

export interface DisciplinaryEvent {
  id: string;
  disciplinary_letter_id: string;
  action: string;
  actor_id: string;
  actor_name_snapshot: string;
  previous_status?: DisciplinaryLetterStatus | null;
  new_status?: DisciplinaryLetterStatus | null;
  note?: string | null;
  created_at: string;
}

export interface DisciplinaryLetter {
  id: string;
  letter_number: string;
  type: DisciplinaryLetterType;
  level: DisciplinaryLetterLevel;
  status: DisciplinaryLetterStatus;
  employee_id: string;
  employee_name_snapshot: string;
  employee_position_snapshot?: string | null;
  outlet_id?: string | null;
  outlet_name_snapshot: string;
  related_task_id?: string | null;
  source_type: DisciplinarySourceType;
  incident_date: string;
  created_by: string;
  created_by_name?: string | null;
  approved_by?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  sent_at?: string | null;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  title: string;
  chronology: string;
  violation_detail: string;
  operational_impact?: string | null;
  correction_instruction: string;
  correction_deadline?: string | null;
  sop_reference?: string | null;
  consequence?: string | null;
  internal_note?: string | null;
  pdf_url?: string | null;
  created_at: string;
  updated_at: string;
  evidence?: DisciplinaryEvidence[];
  events?: DisciplinaryEvent[];
  employee_history_count?: number;
}

export interface DisciplinaryEvidenceInput {
  evidence_type: DisciplinaryEvidenceType;
  file_url?: string | null;
  text_note?: string | null;
  related_task_photo_id?: string | null;
}

export interface CreateDisciplinaryLetterPayload {
  type: DisciplinaryLetterType;
  level: DisciplinaryLetterLevel;
  employee_id: string;
  outlet_id?: string | null;
  outlet_name?: string | null;
  employee_name?: string | null;
  employee_position?: string | null;
  related_task_id?: string | null;
  source_type: DisciplinarySourceType;
  incident_date: string;
  title?: string;
  chronology: string;
  violation_detail: string;
  operational_impact?: string | null;
  correction_instruction: string;
  correction_deadline?: string | null;
  sop_reference?: string | null;
  consequence?: string | null;
  internal_note?: string | null;
  evidence?: DisciplinaryEvidenceInput[];
  submit_for_approval?: boolean;
}

export interface UpdateDisciplinaryLetterPayload
  extends Partial<CreateDisciplinaryLetterPayload> {
  id: string;
}

export interface DisciplinaryFilters {
  outlet?: string;
  employee_id?: string;
  type?: DisciplinaryLetterType | "ALL";
  level?: DisciplinaryLetterLevel | "ALL";
  status?: DisciplinaryLetterStatus | "ALL";
  date_from?: string;
  date_to?: string;
}

export interface DisciplinarySummary {
  total_this_month: number;
  st_active: number;
  sp_active: number;
  waiting_approval: number;
  repeat_employees: number;
}

export interface DisciplinaryDashboardData {
  summary: DisciplinarySummary;
  letters: DisciplinaryLetter[];
}

export interface DisciplinaryTaskPrefill {
  related_task_id: string;
  employee_id: string;
  employee_name: string;
  employee_position?: string | null;
  outlet_id?: string | null;
  outlet_name: string;
  source_type: DisciplinarySourceType;
  incident_date: string;
  title: string;
  chronology: string;
  violation_detail: string;
  correction_instruction: string;
  suggested_type: DisciplinaryLetterType;
  suggested_level: DisciplinaryLetterLevel;
  integrity_warning: boolean;
  evidence: DisciplinaryEvidenceInput[];
  task_link?: string | null;
  previous_letter_count: number;
}

export const DISCIPLINARY_TYPE_OPTIONS: {
  value: DisciplinaryLetterType;
  label: string;
  short: string;
}[] = [
  { value: "TEGURAN", label: "Surat Teguran (ST)", short: "ST" },
  { value: "PERINGATAN", label: "Surat Peringatan (SP)", short: "SP" },
];

export const DISCIPLINARY_SOURCE_OPTIONS: {
  value: DisciplinarySourceType;
  label: string;
}[] = [
  { value: "TASK_LATE", label: "Task terlambat" },
  { value: "TASK_INCOMPLETE", label: "Task tidak selesai" },
  { value: "FAKE_REPORT", label: "Laporan palsu / foto tidak valid" },
  { value: "SOP_VIOLATION", label: "Pelanggaran SOP" },
  { value: "ATTENDANCE", label: "Absensi" },
  { value: "ATTITUDE", label: "Attitude / insubordinasi" },
  { value: "OTHER", label: "Lainnya" },
];

export const DISCIPLINARY_STATUS_OPTIONS: {
  value: DisciplinaryLetterStatus;
  label: string;
}[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "WAITING_APPROVAL", label: "Menunggu Approval" },
  { value: "APPROVED", label: "Disetujui" },
  { value: "SENT", label: "Terkirim" },
  { value: "ACKNOWLEDGED", label: "Diakui" },
  { value: "RESOLVED", label: "Selesai" },
  { value: "CANCELLED", label: "Dibatalkan" },
];


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

// =============================================
// STAFF STATIC REPORT LINK (Daily Report / SOP)
// Report = kegiatan standar + checklist + foto + kondisi
// Bukan input teks bebas.
// =============================================

/** Kondisi hasil kerja — pilihan tombol, bukan teks bebas */
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

/** Jenis report: wajib harian | tugas khusus | quick kendala */
export type ReportTemplateKind = "daily_required" | "special_task" | "issue_quick";

export interface StaffReportLink {
  id: string;
  staff_id: string;
  /** Token aman panjang (internal / fallback) */
  token: string;
  /** Kode pendek dari nama, contoh: dul → /r/dul */
  short_code: string;
  is_active: boolean;
  created_at: string;
  revoked_at?: string | null;
  staff_name?: string;
  outlet?: Outlet | string;
  position?: string;
  /** URL pendek untuk dibagikan */
  report_url?: string;
  /** URL panjang (token) — cadangan */
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
  title: string;
  category: ReportTemplateCategory;
  /** Outlet code e.g. "KBU", null = semua outlet */
  outlet_id: string | null;
  /** Jabatan/group: Waiters | Bar | Dapur | null = semua */
  position_group: string | null;
  /** Standar hasil kerja (SOP mini) */
  standard_result: string;
  /** Deskripsi singkat / tujuan — legacy alias display */
  description: string;
  requires_photo: boolean;
  is_required_daily: boolean;
  kind: ReportTemplateKind;
  target_time_start?: string | null; // "09:00"
  target_time_end?: string | null; // "10:00"
  active: boolean;
  sort_order: number;
  created_at: string;
  checklist_items?: ReportTemplateChecklistItem[];
}

export interface CreateReportTemplatePayload {
  title: string;
  category?: ReportTemplateCategory;
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
  category?: ReportTemplateCategory;
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
  /** Denormalized */
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
  /** Denormalized for dashboard */
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

/** Label warna dashboard */
export type DailyReportRowLabel =
  | "selesai_lengkap" // hijau
  | "selesai_kendala" // kuning
  | "belum_submit" // merah
  | "tidak_wajib" // abu
  | "perlu_perbaikan"; // oranye — leader minta revisi / tidak valid

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

/** @deprecated use status_condition */
export type DailyReportStatus = "submitted" | "issue" | "reviewed";

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

// =============================================
// LEADER MONITORING (kontrol lapangan di atas Daily Report)
// Staff submit ≠ otomatis benar. Leader cek fisik → validasi.
// =============================================

export type LeaderMonitorKind =
  | "opening_control"
  | "jam_ramai_control"
  | "spot_check_area"
  | "closing_control"
  | "issue_log";

/** Hijau / Kuning / Merah hasil keliling leader */
export type LeaderMonitorStatus = "aman" | "ada_catatan" | "tidak_sesuai";

/** Skor per titik: 2 aman, 1 catatan, 0 gagal */
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
  /** Link ke laporan staff (spot check / validasi) */
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
  { kind: "issue_log", label: "Issue Log / Catatan Masalah", short: "Issue Log" },
];

export const LEADER_MONITOR_STATUS_OPTIONS: {
  value: LeaderMonitorStatus;
  label: string;
  color: string;
}[] = [
  { value: "aman", label: "Aman / Siap", color: "green" },
  { value: "ada_catatan", label: "Ada catatan", color: "yellow" },
  { value: "tidak_sesuai", label: "Tidak sesuai / belum siap", color: "red" },
];

export const LEADER_SCORE_OPTIONS: {
  value: LeaderItemScore;
  label: string;
}[] = [
  { value: 2, label: "Aman" },
  { value: 1, label: "Catatan" },
  { value: 0, label: "Gagal" },
];

export const STAFF_VALIDATION_OPTIONS: {
  value: StaffReportValidationStatus;
  label: string;
}[] = [
  { value: "valid", label: "Valid — sesuai lapangan" },
  { value: "revisi", label: "Revisi — staff wajib ulang" },
  { value: "tidak_valid", label: "Tidak valid" },
  { value: "manipulasi", label: "Diduga manipulasi" },
];

export const LEADER_FOLLOW_UP_OPTIONS: {
  value: LeaderFollowUpStatus;
  label: string;
}[] = [
  { value: "open", label: "Open" },
  { value: "on_progress", label: "On Progress" },
  { value: "selesai", label: "Selesai" },
];

export const LEADER_SHIFTS = ["Pagi", "Siang", "Malam"] as const;

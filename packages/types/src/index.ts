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

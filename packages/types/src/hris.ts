export type HrisStaffRole = "staff" | "leader" | "admin";
export type HrisStaffStatus = "active" | "inactive";

export interface HrisOutletRef {
  id: string;
  name: string;
}

export interface HrisDivisionRef {
  id: string;
  name: string;
}

export interface HrisPositionRef {
  id: string;
  name: string;
}

export interface HrisStaffRecord {
  id: string;
  employee_code: string;
  name: string;
  phone: string | null;
  outlet: HrisOutletRef;
  division: HrisDivisionRef;
  position: HrisPositionRef;
  role: HrisStaffRole;
  status: HrisStaffStatus;
  joined_at?: string | null;
  updated_at?: string | null;
}

export interface HrisPaginatedMeta {
  current_page: number;
  last_page: number;
  per_page?: number;
  total: number;
}

export interface HrisStaffListResponse {
  data: HrisStaffRecord[];
  meta: HrisPaginatedMeta;
}

export interface HrisAttendanceTodayRecord {
  staff_id: string;
  employee_code: string;
  name: string;
  outlet_id: string;
  division_id: string;
  attendance_status:
    | "hadir"
    | "belum_hadir"
    | "terlambat"
    | "izin"
    | "sakit"
    | "libur";
  check_in_at?: string | null;
  check_out_at?: string | null;
}

export type HrisLinkStatus =
  | "LINKED"
  | "UNLINKED"
  | "AMBIGUOUS"
  | "MANUAL_REVIEW";

export interface HrisIntegrationStatus {
  enabled: boolean;
  configured: boolean;
  connected: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  staff_linked_count: number;
  staff_unlinked_count: number;
  staff_manual_review_count: number;
  last_error: string | null;
}

export interface HrisSyncResult {
  log_id: string;
  status: "success" | "partial" | "failed";
  checked_count: number;
  created_count: number;
  updated_count: number;
  deactivated_count: number;
  failed_count: number;
  errors: string[];
}

export interface HrisSyncPreviewItem {
  action: string;
  hris_staff_id: string;
  employee_code: string;
  name: string;
  local_staff_id?: string;
  reason?: string;
  wa_needs_completion?: boolean;
  preserve_local_role?: boolean;
}

export interface HrisSyncPreviewResult {
  dry_run: true;
  checked_count: number;
  would_create: HrisSyncPreviewItem[];
  would_update: HrisSyncPreviewItem[];
  would_deactivate: HrisSyncPreviewItem[];
  failed: HrisSyncPreviewItem[];
  ambiguous: HrisSyncPreviewItem[];
  unchanged_count: number;
  incremental_since: string | null;
}

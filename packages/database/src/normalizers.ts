/**
 * Normalize v1 GAS / Sheets field shapes into v2 domain values.
 * Shared by sync scripts and (optionally) gas-adapter fallback.
 */

import type {
  StaffRole,
  StaffStatus,
  TaskPriority,
  TaskStatus,
} from "@prisma/client";

export function pickField(
  obj: Record<string, unknown>,
  keys: string[],
): unknown {
  for (const key of keys) {
    const v = obj[key];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

export function asString(value: unknown, fallback = ""): string {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

export function coerceBoolean(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const v = value.trim().toUpperCase();
    return (
      v === "TRUE" ||
      v === "YES" ||
      v === "Y" ||
      v === "1" ||
      v === "ACTIVE"
    );
  }
  return false;
}

const TASK_STATUSES = new Set<string>([
  "CREATED",
  "SENT",
  "WA_FAILED",
  "OPEN",
  "OPENED",
  "SUBMITTED",
  "RESUBMITTED",
  "WAITING_VERIFICATION",
  "DONE",
  "VERIFIED",
  "REVISI",
  "REVISION",
  "REVISION_REQUESTED",
  "LATE",
]);

export function normalizeStatus(value: unknown): TaskStatus {
  const raw = asString(value, "CREATED").toUpperCase();
  if (TASK_STATUSES.has(raw)) return raw as TaskStatus;
  return "CREATED";
}

export function normalizePriority(value: unknown): TaskPriority {
  const raw = asString(value, "Medium");
  const map: Record<string, TaskPriority> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
  };
  return map[raw.toLowerCase()] ?? "Medium";
}

export function normalizeStaffRole(value: unknown): StaffRole {
  const raw = asString(value, "STAFF").toUpperCase();
  if (raw === "LEADER" || raw === "ADMIN" || raw === "STAFF") return raw;
  return "STAFF";
}

export function normalizeStaffStatus(row: Record<string, unknown>): StaffStatus {
  if (
    coerceBoolean(row.is_active) ||
    asString(row.status).toUpperCase() === "ACTIVE" ||
    asString(row.active_status).toUpperCase() === "ACTIVE"
  ) {
    return "ACTIVE";
  }
  return "INACTIVE";
}

/** Map v1 outlet display names / codes → v2 outlet code */
export function normalizeOutletCode(value: unknown): string {
  const raw = asString(value, "KBU");
  const upper = raw.toUpperCase();
  if (upper === "KBU" || upper.includes("BURI") || upper.includes("KOPI")) {
    return "KBU";
  }
  if (upper === "KISAMEN" || upper.includes("KISA")) return "KISAMEN";
  if (
    upper === "SAMTARO" ||
    upper === "SAMTARO EXPRESS" ||
    upper.includes("SAMTAR")
  ) {
    return "SAMTARO";
  }
  return upper.slice(0, 50);
}

export function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function unwrapList(
  data: unknown,
  keys: string[] = ["data", "tasks", "staff", "rows", "items", "areas", "categories"],
): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.map((item) =>
      typeof item === "string"
        ? { name: item }
        : (item as Record<string, unknown>),
    );
  }
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of keys) {
      if (Array.isArray(obj[key])) {
        return unwrapList(obj[key], keys);
      }
    }
  }
  return [];
}

export interface NormalizedTaskRow {
  taskId: string;
  token: string;
  createdBy: string | null;
  outletCode: string;
  areaName: string | null;
  categoryName: string | null;
  taskTitle: string;
  taskDescription: string | null;
  priority: TaskPriority;
  picName: string;
  picWa: string;
  staffId: string | null;
  deadline: Date;
  beforePhotoUrl: string | null;
  status: TaskStatus;
  reportLink: string | null;
  waSentAt: Date | null;
  openedAt: Date | null;
  submittedAt: Date | null;
  afterPhotoUrl: string | null;
  staffNote: string | null;
  leaderVerification: string | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  finalStatus: string | null;
  isLate: boolean;
  durationMinutes: number | null;
  checklistMode: boolean;
  recurringTemplateId: string | null;
  createdAt: Date | null;
}

export function normalizeTaskRow(
  row: Record<string, unknown>,
): NormalizedTaskRow | null {
  const taskId = asString(pickField(row, ["task_id", "taskId", "id"]));
  const token = asString(pickField(row, ["token"]));
  const taskTitle = asString(
    pickField(row, ["task_title", "taskTitle", "title"]),
  );
  const picName = asString(pickField(row, ["pic_name", "picName"]));
  const picWa = asString(pickField(row, ["pic_wa", "picWa"]));
  const deadline = parseDate(pickField(row, ["deadline"]));

  if (!taskId || !token || !taskTitle || !picName || !picWa || !deadline) {
    return null;
  }

  const durationRaw = pickField(row, ["duration_minutes", "durationMinutes"]);
  const durationMinutes =
    durationRaw === undefined || durationRaw === null || durationRaw === ""
      ? null
      : Number(durationRaw);

  return {
    taskId,
    token,
    createdBy: asString(pickField(row, ["created_by", "createdBy"])) || null,
    outletCode: normalizeOutletCode(pickField(row, ["outlet", "outlet_code"])),
    areaName: asString(pickField(row, ["area", "area_name"])) || null,
    categoryName:
      asString(pickField(row, ["category", "category_name"])) || null,
    taskTitle,
    taskDescription:
      asString(pickField(row, ["task_description", "taskDescription"])) || null,
    priority: normalizePriority(pickField(row, ["priority"])),
    picName,
    picWa,
    staffId: asString(pickField(row, ["staff_id", "staffId"])) || null,
    deadline,
    beforePhotoUrl:
      asString(pickField(row, ["before_photo_url", "beforePhotoUrl"])) || null,
    status: normalizeStatus(pickField(row, ["status"])),
    reportLink: asString(pickField(row, ["report_link", "reportLink"])) || null,
    waSentAt: parseDate(pickField(row, ["wa_sent_at", "waSentAt"])),
    openedAt: parseDate(pickField(row, ["opened_at", "openedAt"])),
    submittedAt: parseDate(pickField(row, ["submitted_at", "submittedAt"])),
    afterPhotoUrl:
      asString(pickField(row, ["after_photo_url", "afterPhotoUrl"])) || null,
    staffNote: asString(pickField(row, ["staff_note", "staffNote"])) || null,
    leaderVerification:
      asString(pickField(row, ["leader_verification", "leaderVerification"])) ||
      null,
    verifiedBy: asString(pickField(row, ["verified_by", "verifiedBy"])) || null,
    verifiedAt: parseDate(pickField(row, ["verified_at", "verifiedAt"])),
    finalStatus:
      asString(pickField(row, ["final_status", "finalStatus"])) || null,
    isLate: coerceBoolean(pickField(row, ["is_late", "isLate"])),
    durationMinutes:
      durationMinutes !== null && Number.isFinite(durationMinutes)
        ? durationMinutes
        : null,
    checklistMode: coerceBoolean(
      pickField(row, ["checklist_mode", "checklistMode"]),
    ),
    recurringTemplateId:
      asString(
        pickField(row, ["recurring_template_id", "recurringTemplateId"]),
      ) || null,
    createdAt: parseDate(pickField(row, ["created_at", "createdAt"])),
  };
}

export interface NormalizedStaffRow {
  staffId: string;
  name: string;
  position: string | null;
  outletCode: string;
  areaName: string | null;
  waNumber: string;
  role: StaffRole;
  status: StaffStatus;
  loginEnabled: boolean;
}

export function normalizeStaffRow(
  row: Record<string, unknown>,
): NormalizedStaffRow | null {
  const staffId = asString(pickField(row, ["staff_id", "staffId"]));
  const name = asString(pickField(row, ["staff_name", "name"]));
  const waNumber = asString(pickField(row, ["wa_number", "waNumber"]));
  if (!staffId || !name || !waNumber) return null;

  return {
    staffId,
    name,
    position: asString(pickField(row, ["position"])) || null,
    outletCode: normalizeOutletCode(pickField(row, ["outlet", "outlet_code"])),
    areaName: asString(pickField(row, ["area", "area_name"])) || null,
    waNumber,
    role: normalizeStaffRole(pickField(row, ["role"])),
    status: normalizeStaffStatus(row),
    loginEnabled: coerceBoolean(
      pickField(row, ["login_enabled", "loginEnabled"]),
    ),
  };
}

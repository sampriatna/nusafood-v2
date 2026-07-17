/**
 * Normalize v1 GAS / Sheets field shapes into v2 domain values.
 * Shared by sync scripts and (optionally) gas-adapter fallback.
 */

import type {
  RepeatType,
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

export function coerceBoolean(value: unknown, defaultValue = false): boolean {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  if (typeof value === "string") {
    const v = value.trim().toUpperCase();
    if (v === "TRUE" || v === "YES" || v === "Y" || v === "1" || v === "ACTIVE") {
      return true;
    }
    if (v === "FALSE" || v === "NO" || v === "N" || v === "0" || v === "INACTIVE") {
      return false;
    }
  }
  return defaultValue;
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

const REPEAT_TYPES = new Set<string>([
  "daily",
  "weekdays",
  "weekly",
  "monthly",
  "custom",
]);

export function normalizeRepeatType(value: unknown): RepeatType {
  const raw = asString(value, "daily").toLowerCase();
  if (REPEAT_TYPES.has(raw)) return raw as RepeatType;
  return "daily";
}

export function parseTimeOfDay(value: unknown, fallback = "08:00"): Date {
  const raw = asString(value, fallback);
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    const [h = "8", m = "0"] = fallback.split(":");
    return new Date(Date.UTC(1970, 0, 1, Number(h), Number(m), 0));
  }
  return new Date(
    Date.UTC(1970, 0, 1, Number(match[1]), Number(match[2]), 0),
  );
}

export interface NormalizedChecklistTemplateRow {
  templateId: string;
  templateName: string;
  outletCode: string;
  areaName: string | null;
  taskTitle: string | null;
  checklistTitle: string;
  picName: string | null;
  picWa: string | null;
  requiresPhoto: boolean;
  activeStatus: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export function normalizeChecklistTemplateRow(
  row: Record<string, unknown>,
): NormalizedChecklistTemplateRow | null {
  const templateId = asString(pickField(row, ["template_id", "templateId"]));
  const templateName = asString(
    pickField(row, ["template_name", "templateName", "name"]),
  );
  const checklistTitle = asString(
    pickField(row, ["checklist_title", "checklistTitle", "task_title", "taskTitle"]),
  );

  if (!templateId || !templateName) return null;

  return {
    templateId,
    templateName,
    outletCode: normalizeOutletCode(pickField(row, ["outlet", "outlet_code"])),
    areaName: asString(pickField(row, ["area", "area_name"])) || null,
    taskTitle:
      asString(pickField(row, ["task_title", "taskTitle"])) || null,
    checklistTitle: checklistTitle || templateName,
    picName: asString(pickField(row, ["pic_name", "picName"])) || null,
    picWa: asString(pickField(row, ["pic_wa", "picWa"])) || null,
    requiresPhoto: coerceBoolean(
      pickField(row, ["requires_photo", "requiresPhoto"]),
    ),
    activeStatus: coerceBoolean(
      pickField(row, ["active_status", "activeStatus", "is_active"]),
      true,
    ),
    createdAt: parseDate(pickField(row, ["created_at", "createdAt"])),
    updatedAt: parseDate(pickField(row, ["updated_at", "updatedAt"])),
  };
}

export interface NormalizedChecklistItemRow {
  checklistItemId: string;
  templateId: string;
  itemOrder: number;
  itemText: string;
  requiresPhoto: boolean;
  isRequired: boolean;
  activeStatus: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export function normalizeChecklistItemRow(
  row: Record<string, unknown>,
): NormalizedChecklistItemRow | null {
  const checklistItemId = asString(
    pickField(row, ["checklist_item_id", "checklistItemId", "item_id"]),
  );
  const templateId = asString(pickField(row, ["template_id", "templateId"]));
  const itemText = asString(pickField(row, ["item_text", "itemText", "text"]));
  const orderRaw = pickField(row, ["item_order", "itemOrder", "order"]);

  if (!checklistItemId || !templateId || !itemText) return null;

  const itemOrder = Number(orderRaw);
  if (!Number.isFinite(itemOrder) || itemOrder < 1) return null;

  return {
    checklistItemId,
    templateId,
    itemOrder,
    itemText,
    requiresPhoto: coerceBoolean(
      pickField(row, ["requires_photo", "requiresPhoto"]),
    ),
    isRequired: coerceBoolean(
      pickField(row, ["is_required", "isRequired"]),
      true,
    ),
    activeStatus: coerceBoolean(
      pickField(row, ["active_status", "activeStatus", "is_active"]),
      true,
    ),
    createdAt: parseDate(pickField(row, ["created_at", "createdAt"])),
    updatedAt: parseDate(pickField(row, ["updated_at", "updatedAt"])),
  };
}

export interface NormalizedRecurringTemplateRow {
  templateId: string;
  templateName: string;
  outletCode: string;
  areaName: string | null;
  categoryName: string | null;
  picName: string;
  picWa: string;
  staffId: string | null;
  taskTitle: string;
  taskDescription: string | null;
  repeatType: RepeatType;
  repeatDays: string[];
  repeatTime: Date;
  deadlineTime: Date;
  requiresPhoto: boolean;
  activeStatus: boolean;
  templateVersion: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

function normalizeRepeatDays(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => asString(v).toLowerCase()).filter(Boolean);
  }
  const raw = asString(value);
  if (!raw) return [];
  return raw
    .split(/[,;|]/)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeRecurringTemplateRow(
  row: Record<string, unknown>,
): NormalizedRecurringTemplateRow | null {
  const templateId = asString(pickField(row, ["template_id", "templateId"]));
  const templateName = asString(
    pickField(row, ["template_name", "templateName", "name"]),
  );
  const taskTitle = asString(pickField(row, ["task_title", "taskTitle"]));
  const picName = asString(pickField(row, ["pic_name", "picName"]));
  const picWa = asString(pickField(row, ["pic_wa", "picWa"]));

  if (!templateId || !templateName || !taskTitle || !picName || !picWa) {
    return null;
  }

  const versionRaw = pickField(row, ["template_version", "templateVersion"]);
  const templateVersion =
    versionRaw === undefined || versionRaw === null || versionRaw === ""
      ? 1
      : Number(versionRaw);

  return {
    templateId,
    templateName,
    outletCode: normalizeOutletCode(pickField(row, ["outlet", "outlet_code"])),
    areaName: asString(pickField(row, ["area", "area_name"])) || null,
    categoryName:
      asString(pickField(row, ["category", "category_name"])) || null,
    picName,
    picWa,
    staffId: asString(pickField(row, ["staff_id", "staffId"])) || null,
    taskTitle,
    taskDescription:
      asString(pickField(row, ["task_description", "taskDescription"])) ||
      null,
    repeatType: normalizeRepeatType(pickField(row, ["repeat_type", "repeatType"])),
    repeatDays: normalizeRepeatDays(
      pickField(row, ["repeat_days", "repeatDays"]),
    ),
    repeatTime: parseTimeOfDay(
      pickField(row, ["repeat_time", "repeatTime"]),
      "08:00",
    ),
    deadlineTime: parseTimeOfDay(
      pickField(row, ["deadline_time", "deadlineTime"]),
      "17:00",
    ),
    requiresPhoto: coerceBoolean(
      pickField(row, ["requires_photo", "requiresPhoto"]),
      true,
    ),
    activeStatus: coerceBoolean(
      pickField(row, ["active_status", "activeStatus", "is_active"]),
      true,
    ),
    templateVersion:
      Number.isFinite(templateVersion) && templateVersion > 0
        ? templateVersion
        : 1,
    createdAt: parseDate(pickField(row, ["created_at", "createdAt"])),
    updatedAt: parseDate(pickField(row, ["updated_at", "updatedAt"])),
  };
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

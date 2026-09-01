import type { HrisStaffRecord } from "@nusafood/types";
import type { HrisLinkStatus, Staff, StaffStatus } from "@prisma/client";
import { normalizeHrisPhone } from "@/lib/services/hris-api.client";
import {
  isWaNeedsCompletion,
  placeholderWaForHris,
} from "@/lib/services/hris-wa";

export type StaffSyncPlanAction =
  | "create"
  | "update"
  | "deactivate"
  | "unchanged"
  | "failed"
  | "ambiguous";

export interface StaffSyncPlanItem {
  action: StaffSyncPlanAction;
  hris_staff_id: string;
  employee_code: string;
  name: string;
  local_staff_id?: string;
  reason?: string;
  wa_needs_completion?: boolean;
  preserve_local_role?: boolean;
}

export interface StaffSyncPlanSummary {
  checked_count: number;
  would_create: StaffSyncPlanItem[];
  would_update: StaffSyncPlanItem[];
  would_deactivate: StaffSyncPlanItem[];
  failed: StaffSyncPlanItem[];
  ambiguous: StaffSyncPlanItem[];
  unchanged_count: number;
}

export type LocalStaffSnapshot = Pick<
  Staff,
  | "staffId"
  | "hrisStaffId"
  | "name"
  | "waNumber"
  | "waNeedsCompletion"
  | "outletId"
  | "role"
  | "position"
  | "status"
>;

export function mapHrisStatus(status: string): StaffStatus {
  return status === "active" ? "ACTIVE" : "INACTIVE";
}

export function resolveWaFromHris(record: HrisStaffRecord): {
  waNumber: string;
  waNeedsCompletion: boolean;
} {
  const phone = normalizeHrisPhone(record.phone);
  if (phone) {
    return { waNumber: phone, waNeedsCompletion: false };
  }
  return {
    waNumber: placeholderWaForHris(record.id.trim()),
    waNeedsCompletion: true,
  };
}

export function buildHrisFields(record: HrisStaffRecord) {
  const hrisStaffId = record.id.trim();
  const { waNumber, waNeedsCompletion } = resolveWaFromHris(record);

  return {
    hrisStaffId,
    hrisEmployeeCode: record.employee_code.trim(),
    hrisOutletCode: record.outlet.id.trim(),
    hrisDivisionCode: record.division.id.trim(),
    hrisDivisionName: record.division.name,
    hrisPositionCode: record.position.id.trim(),
    hrisPositionName: record.position.name,
    name: record.name.trim(),
    waNumber,
    waNeedsCompletion,
    status: mapHrisStatus(record.status),
    hrisLinkStatus: (waNeedsCompletion
      ? "MANUAL_REVIEW"
      : "LINKED") as HrisLinkStatus,
  };
}

/** Fase 1: role Task Dashboard tidak di-overwrite dari HRIS. */
export function buildStaffUpdateFromHris(
  record: HrisStaffRecord,
  existing: LocalStaffSnapshot,
  outletId: string,
): Record<string, unknown> {
  const fields = buildHrisFields(record);

  const nextWa =
    fields.waNeedsCompletion && !existing.waNeedsCompletion
      ? existing.waNumber
      : fields.waNumber;

  const nextWaNeedsCompletion =
    fields.waNeedsCompletion && isWaNeedsCompletion(existing.waNumber)
      ? true
      : !fields.waNeedsCompletion
        ? false
        : existing.waNeedsCompletion;

  return {
    name: fields.name,
    waNumber: nextWa,
    waNeedsCompletion: nextWaNeedsCompletion,
    outletId,
    status: fields.status,
    hrisStaffId: fields.hrisStaffId,
    hrisEmployeeCode: fields.hrisEmployeeCode,
    hrisOutletCode: fields.hrisOutletCode,
    hrisDivisionCode: fields.hrisDivisionCode,
    hrisDivisionName: fields.hrisDivisionName,
    hrisPositionCode: fields.hrisPositionCode,
    hrisPositionName: fields.hrisPositionName,
    hrisLinkStatus: nextWaNeedsCompletion ? "MANUAL_REVIEW" : "LINKED",
    // role & position lokal dipertahankan — tidak disertakan
  };
}

export function planStaffSyncAction(input: {
  record: HrisStaffRecord;
  outletId: string | null;
  existingByHrisId?: LocalStaffSnapshot | null;
  localMatchesByWa?: LocalStaffSnapshot[];
}): StaffSyncPlanItem {
  const hrisStaffId = input.record.id.trim();

  if (!input.outletId) {
    return {
      action: "failed",
      hris_staff_id: hrisStaffId,
      employee_code: input.record.employee_code,
      name: input.record.name,
      reason: `Outlet HRIS ${input.record.outlet.id} belum dimapping`,
    };
  }

  const fields = buildHrisFields(input.record);

  if (input.existingByHrisId) {
    const wasActive = input.existingByHrisId.status === "ACTIVE";
    const willInactive = fields.status === "INACTIVE";
    if (wasActive && willInactive) {
      return {
        action: "deactivate",
        hris_staff_id: hrisStaffId,
        employee_code: input.record.employee_code,
        name: input.record.name,
        local_staff_id: input.existingByHrisId.staffId,
        wa_needs_completion: fields.waNeedsCompletion,
        preserve_local_role: true,
      };
    }
    return {
      action: "update",
      hris_staff_id: hrisStaffId,
      employee_code: input.record.employee_code,
      name: input.record.name,
      local_staff_id: input.existingByHrisId.staffId,
      wa_needs_completion: fields.waNeedsCompletion,
      preserve_local_role: true,
    };
  }

  const waMatches = input.localMatchesByWa ?? [];
  if (waMatches.length > 1) {
    return {
      action: "ambiguous",
      hris_staff_id: hrisStaffId,
      employee_code: input.record.employee_code,
      name: input.record.name,
      reason: "Beberapa staf lokal cocok WA+outlet",
    };
  }

  if (waMatches.length === 1) {
    return {
      action: "update",
      hris_staff_id: hrisStaffId,
      employee_code: input.record.employee_code,
      name: input.record.name,
      local_staff_id: waMatches[0].staffId,
      wa_needs_completion: fields.waNeedsCompletion,
      preserve_local_role: true,
    };
  }

  return {
    action: "create",
    hris_staff_id: hrisStaffId,
    employee_code: input.record.employee_code,
    name: input.record.name,
    wa_needs_completion: fields.waNeedsCompletion,
    preserve_local_role: true,
  };
}

export function summarizeSyncPlan(items: StaffSyncPlanItem[]): StaffSyncPlanSummary {
  const summary: StaffSyncPlanSummary = {
    checked_count: items.length,
    would_create: [],
    would_update: [],
    would_deactivate: [],
    failed: [],
    ambiguous: [],
    unchanged_count: 0,
  };

  for (const item of items) {
    switch (item.action) {
      case "create":
        summary.would_create.push(item);
        break;
      case "update":
        summary.would_update.push(item);
        break;
      case "deactivate":
        summary.would_deactivate.push(item);
        break;
      case "failed":
        summary.failed.push(item);
        break;
      case "ambiguous":
        summary.ambiguous.push(item);
        break;
      case "unchanged":
        summary.unchanged_count++;
        break;
    }
  }

  return summary;
}

export function validateManualLink(input: {
  local: LocalStaffSnapshot;
  remote: HrisStaffRecord;
  conflictStaffId?: string | null;
  resolvedOutletId: string | null;
}): { ok: true } | { ok: false; code: string; message: string; status: number } {
  if (input.conflictStaffId) {
    return {
      ok: false,
      code: "HRIS_STAFF_CONFLICT",
      message: "NIK HRIS sudah terhubung ke staf lain",
      status: 409,
    };
  }

  if (!input.resolvedOutletId) {
    return {
      ok: false,
      code: "OUTLET_NOT_MAPPED",
      message: `Outlet HRIS ${input.remote.outlet.id} belum dimapping`,
      status: 422,
    };
  }

  return { ok: true };
}

export function buildManualLinkUpdate(
  local: LocalStaffSnapshot,
  remote: HrisStaffRecord,
  outletId: string,
) {
  const fields = buildHrisFields(remote);
  const validation = validateManualLink({
    local,
    remote,
    conflictStaffId: null,
    resolvedOutletId: outletId,
  });
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  return {
    name: fields.name,
    waNumber:
      fields.waNeedsCompletion && !local.waNeedsCompletion
        ? local.waNumber
        : fields.waNumber,
    waNeedsCompletion:
      fields.waNeedsCompletion && isWaNeedsCompletion(local.waNumber)
        ? true
        : fields.waNeedsCompletion
          ? local.waNeedsCompletion
          : false,
    outletId,
    status: fields.status,
    hrisStaffId: fields.hrisStaffId,
    hrisEmployeeCode: fields.hrisEmployeeCode,
    hrisOutletCode: fields.hrisOutletCode,
    hrisDivisionCode: fields.hrisDivisionCode,
    hrisDivisionName: fields.hrisDivisionName,
    hrisPositionCode: fields.hrisPositionCode,
    hrisPositionName: fields.hrisPositionName,
    hrisLinkStatus: fields.hrisLinkStatus,
    hrisSyncedAt: new Date(),
    // role & position lokal tidak diubah
  };
}

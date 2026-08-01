import type { HrisStaffRecord, HrisSyncResult } from "@nusafood/types";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateStaffId } from "@/lib/id";
import {
  HrisApiClient,
  HrisApiError,
  normalizeHrisPhone,
} from "@/lib/services/hris-api.client";
import {
  acquireHrisSyncLock,
  releaseHrisSyncLock,
} from "@/lib/services/hris-sync-lock.service";
import {
  buildHrisFields,
  buildManualLinkUpdate,
  buildStaffUpdateFromHris,
  planStaffSyncAction,
  summarizeSyncPlan,
  type LocalStaffSnapshot,
  type StaffSyncPlanItem,
  type StaffSyncPlanSummary,
  validateManualLink,
} from "@/lib/services/hris-sync-plan";

const STAFF_SELECT = {
  staffId: true,
  hrisStaffId: true,
  name: true,
  waNumber: true,
  waNeedsCompletion: true,
  outletId: true,
  role: true,
  position: true,
  status: true,
} satisfies Prisma.StaffSelect;

export function isOutletMappingConfirmed(): boolean {
  return process.env.HRIS_OUTLET_MAPPING_CONFIRMED === "true";
}

export async function assertOutletMappingReady(): Promise<void> {
  if (!isOutletMappingConfirmed()) {
    throw new HrisApiError(
      "Mapping outlet belum dikonfirmasi admin (HRIS_OUTLET_MAPPING_CONFIRMED)",
      "OUTLET_MAPPING_NOT_CONFIRMED",
      422,
    );
  }

  const unmapped = await prisma.outlet.count({
    where: { isActive: true, hrisOutletCode: null },
  });
  if (unmapped > 0) {
    throw new HrisApiError(
      `${unmapped} outlet aktif belum memiliki hris_outlet_code`,
      "OUTLET_MAPPING_INCOMPLETE",
      422,
    );
  }
}

async function resolveOutletId(hrisOutletCode: string): Promise<string | null> {
  const code = hrisOutletCode.trim();
  const byMapping = await prisma.outlet.findFirst({
    where: { hrisOutletCode: code, isActive: true },
    select: { id: true },
  });
  if (byMapping) return byMapping.id;

  const byCode = await prisma.outlet.findFirst({
    where: { code: { equals: code, mode: "insensitive" }, isActive: true },
    select: { id: true },
  });
  return byCode?.id ?? null;
}

export async function getLastSuccessfulSyncTime(): Promise<string | undefined> {
  const log = await prisma.hrisSyncLog.findFirst({
    where: { status: { in: ["success", "partial"] }, completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
  });
  return log?.completedAt?.toISOString();
}

async function loadSyncContext(record: HrisStaffRecord) {
  const hrisStaffId = record.id.trim();
  const outletId = await resolveOutletId(record.outlet.id);
  const existingByHrisId = await prisma.staff.findUnique({
    where: { hrisStaffId },
    select: STAFF_SELECT,
  });

  let localMatchesByWa: LocalStaffSnapshot[] = [];
  const phone = normalizeHrisPhone(record.phone);
  if (!existingByHrisId && phone && outletId) {
    localMatchesByWa = await prisma.staff.findMany({
      where: { hrisStaffId: null, outletId, waNumber: phone },
      select: STAFF_SELECT,
    });
  }

  return planStaffSyncAction({
    record,
    outletId,
    existingByHrisId,
    localMatchesByWa,
  });
}

export async function previewHrisStaffSync(options?: {
  updatedSince?: string;
  full?: boolean;
  client?: HrisApiClient;
}): Promise<StaffSyncPlanSummary> {
  if (process.env.HRIS_SYNC_ENABLED !== "true") {
    throw new HrisApiError("Sinkronisasi HRIS dinonaktifkan", "HRIS_SYNC_DISABLED", 503);
  }

  const client = options?.client ?? new HrisApiClient();
  if (!client.isConfigured()) {
    throw new HrisApiError("HRIS API belum dikonfigurasi", "HRIS_NOT_CONFIGURED", 503);
  }

  const updatedSince =
    options?.full === true
      ? undefined
      : (options?.updatedSince ?? (await getLastSuccessfulSyncTime()));

  const items: StaffSyncPlanItem[] = [];
  for await (const batch of client.iterateStaff({
    updated_since: updatedSince,
    status: undefined,
  })) {
    for (const record of batch) {
      items.push(await loadSyncContext(record));
    }
  }

  return summarizeSyncPlan(items);
}

async function applySyncPlanItem(
  plan: StaffSyncPlanItem,
  record: HrisStaffRecord,
  outletId: string,
): Promise<"created" | "updated" | "deactivated"> {
  if (plan.action === "create") {
    const fields = buildHrisFields(record);
    await prisma.staff.create({
      data: {
        staffId: generateStaffId(),
        loginEnabled: false,
        areaId: null,
        outletId,
        role: "STAFF",
        position: null,
        ...fields,
        hrisSyncedAt: new Date(),
      },
    });
    return "created";
  }

  if (plan.action === "deactivate" || plan.action === "update") {
    const existing = await prisma.staff.findUnique({
      where: { staffId: plan.local_staff_id! },
      select: STAFF_SELECT,
    });
    if (!existing) {
      throw new Error(`Staf lokal ${plan.local_staff_id} tidak ditemukan`);
    }

    await prisma.staff.update({
      where: { staffId: existing.staffId },
      data: {
        ...buildStaffUpdateFromHris(record, existing, outletId),
        hrisSyncedAt: new Date(),
      },
    });
    return plan.action === "deactivate" ? "deactivated" : "updated";
  }

  throw new Error(plan.reason ?? "Rencana sync tidak valid");
}

export async function runHrisStaffSync(options?: {
  updatedSince?: string;
  full?: boolean;
  dryRun?: boolean;
  triggeredBy?: string;
  triggeredByName?: string;
  client?: HrisApiClient;
  skipLock?: boolean;
}): Promise<HrisSyncResult | StaffSyncPlanSummary> {
  if (process.env.HRIS_SYNC_ENABLED !== "true") {
    throw new HrisApiError("Sinkronisasi HRIS dinonaktifkan", "HRIS_SYNC_DISABLED", 503);
  }

  const client = options?.client ?? new HrisApiClient();
  if (!client.isConfigured()) {
    throw new HrisApiError("HRIS API belum dikonfigurasi", "HRIS_NOT_CONFIGURED", 503);
  }

  if (options?.dryRun) {
    return previewHrisStaffSync(options);
  }

  await assertOutletMappingReady();

  const lockOwner = options?.triggeredBy ?? "system";
  let lockHeld = false;

  if (!options?.skipLock) {
    const lock = await acquireHrisSyncLock(lockOwner);
    if (!lock.acquired) {
      throw new HrisApiError(
        "Sinkronisasi HRIS sedang berjalan",
        "HRIS_SYNC_IN_PROGRESS",
        409,
      );
    }
    lockHeld = true;
  }

  const updatedSince =
    options?.full === true
      ? undefined
      : (options?.updatedSince ?? (await getLastSuccessfulSyncTime()));

  const log = await prisma.hrisSyncLog.create({
    data: {
      startedAt: new Date(),
      triggeredBy: options?.triggeredBy ?? null,
      triggeredByName: options?.triggeredByName ?? null,
      status: "failed",
      details: {
        mode: options?.full ? "full" : "incremental",
        updated_since: updatedSince ?? null,
      },
    },
  });

  const errors: string[] = [];
  let checkedCount = 0;
  let createdCount = 0;
  let updatedCount = 0;
  let deactivatedCount = 0;
  let failedCount = 0;

  try {
    for await (const batch of client.iterateStaff({
      updated_since: updatedSince,
      status: undefined,
    })) {
      for (const record of batch) {
        checkedCount++;
        try {
          const plan = await loadSyncContext(record);
          if (plan.action === "failed" || plan.action === "ambiguous") {
            failedCount++;
            errors.push(`${record.id}: ${plan.reason ?? plan.action}`);
            continue;
          }
          if (plan.action === "unchanged") continue;

          const outletId = await resolveOutletId(record.outlet.id);
          if (!outletId) {
            failedCount++;
            errors.push(`${record.id}: outlet belum dimapping`);
            continue;
          }

          const outcome = await applySyncPlanItem(plan, record, outletId);
          if (outcome === "created") createdCount++;
          if (outcome === "updated") updatedCount++;
          if (outcome === "deactivated") deactivatedCount++;
        } catch (error) {
          failedCount++;
          errors.push(
            `${record.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }
    }

    const status =
      failedCount === 0 ? "success" : checkedCount > failedCount ? "partial" : "failed";

    await prisma.hrisSyncLog.update({
      where: { id: log.id },
      data: {
        completedAt: new Date(),
        status,
        checkedCount,
        createdCount,
        updatedCount,
        deactivatedCount,
        failedCount,
        errorSummary: errors.slice(0, 20).join("; ") || null,
        details: {
          mode: options?.full ? "full" : "incremental",
          updated_since: updatedSince ?? null,
          errors: errors.slice(0, 100),
        },
      },
    });

    return {
      log_id: log.id,
      status,
      checked_count: checkedCount,
      created_count: createdCount,
      updated_count: updatedCount,
      deactivated_count: deactivatedCount,
      failed_count: failedCount,
      errors: errors.slice(0, 20),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync gagal";
    await prisma.hrisSyncLog.update({
      where: { id: log.id },
      data: {
        completedAt: new Date(),
        status: "failed",
        checkedCount,
        createdCount,
        updatedCount,
        deactivatedCount,
        failedCount: failedCount + 1,
        errorSummary: message,
      },
    });
    throw error;
  } finally {
    if (lockHeld) {
      await releaseHrisSyncLock();
    }
  }
}

export async function manuallyLinkStaffToHris(
  staffId: string,
  hrisStaffId: string,
): Promise<void> {
  const client = new HrisApiClient();
  const remote = await client.getStaff(hrisStaffId);
  if (!remote) {
    throw new HrisApiError("Staf HRIS tidak ditemukan", "HRIS_STAFF_NOT_FOUND", 404);
  }

  await prisma.$transaction(async (tx) => {
    const local = await tx.staff.findUnique({
      where: { staffId },
      select: STAFF_SELECT,
    });
    if (!local) {
      throw new HrisApiError("Staf lokal tidak ditemukan", "NOT_FOUND", 404);
    }

    const conflict = await tx.staff.findFirst({
      where: {
        hrisStaffId: remote.id.trim(),
        NOT: { staffId },
      },
      select: { staffId: true },
    });

    const outletId = await resolveOutletId(remote.outlet.id);
    const validation = validateManualLink({
      local,
      remote,
      conflictStaffId: conflict?.staffId ?? null,
      resolvedOutletId: outletId,
    });

    if (!validation.ok) {
      throw new HrisApiError(validation.message, validation.code, validation.status);
    }

    const previousRole = local.role;
    const previousPosition = local.position;

    await tx.staff.update({
      where: { staffId },
      data: buildManualLinkUpdate(local, remote, outletId!),
    });

    const after = await tx.staff.findUnique({
      where: { staffId },
      select: { role: true, position: true, staffId: true },
    });

    const totalAfter = await tx.staff.count({
      where: { hrisStaffId: remote.id.trim() },
    });
    if (totalAfter !== 1) {
      throw new HrisApiError(
        "Manual link gagal — NIK terhubung ke lebih dari satu staf",
        "HRIS_STAFF_CONFLICT",
        409,
      );
    }

    if (after?.role !== previousRole || after?.position !== previousPosition) {
      throw new HrisApiError(
        "Manual link gagal — role/position lokal berubah",
        "LOCAL_ROLE_CHANGED",
        500,
      );
    }
  });
}

import type { HrisStaffRecord, HrisSyncResult } from "@nusafood/types";
import type { HrisLinkStatus, StaffRole, StaffStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateStaffId } from "@/lib/id";
import {
  HrisApiClient,
  HrisApiError,
  normalizeHrisPhone,
} from "@/lib/services/hris-api.client";
import {
  isPositionGroup,
  sanitizeStaffPosition,
} from "@/lib/position-groups";

const LEADER_KEYWORDS = ["leader", "kepala", "supervisor", "manager", "koordinator"];

function mapHrisRole(role: string): StaffRole {
  if (role === "leader") return "LEADER";
  if (role === "admin") return "ADMIN";
  return "STAFF";
}

function mapHrisStatus(status: string): StaffStatus {
  return status === "active" ? "ACTIVE" : "INACTIVE";
}

function resolveTaskPosition(hrisPositionName?: string | null): string | null {
  const direct = sanitizeStaffPosition(hrisPositionName);
  if (direct && isPositionGroup(direct)) return direct;

  const lower = (hrisPositionName ?? "").toLowerCase();
  if (LEADER_KEYWORDS.some((k) => lower.includes(k))) return "Leader";
  if (lower.includes("bar")) return "Bar";
  if (lower.includes("dapur") || lower.includes("kitchen")) return "Kitchen";
  if (lower.includes("waiter") || lower.includes("floor")) return "Floor";
  if (lower.includes("kasir")) return "Kasir";

  return null;
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

export async function runHrisStaffSync(options?: {
  updatedSince?: string;
  triggeredBy?: string;
  triggeredByName?: string;
  client?: HrisApiClient;
}): Promise<HrisSyncResult> {
  if (process.env.HRIS_SYNC_ENABLED !== "true") {
    throw new HrisApiError("Sinkronisasi HRIS dinonaktifkan", "HRIS_SYNC_DISABLED", 503);
  }

  const client = options?.client ?? new HrisApiClient();
  if (!client.isConfigured()) {
    throw new HrisApiError("HRIS API belum dikonfigurasi", "HRIS_NOT_CONFIGURED", 503);
  }

  const log = await prisma.hrisSyncLog.create({
    data: {
      startedAt: new Date(),
      triggeredBy: options?.triggeredBy ?? null,
      triggeredByName: options?.triggeredByName ?? null,
      status: "failed",
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
      updated_since: options?.updatedSince,
      status: undefined,
    })) {
      for (const record of batch) {
        checkedCount++;
        try {
          const outcome = await upsertStaffFromHris(record);
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

    await backfillUnlinkedStaff(errors);

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
        details: { errors: errors.slice(0, 100) },
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
  }
}

async function upsertStaffFromHris(
  record: HrisStaffRecord,
): Promise<"created" | "updated" | "deactivated" | "unchanged"> {
  const hrisStaffId = record.id.trim();
  const phone = normalizeHrisPhone(record.phone) ?? "";
  const outletId = await resolveOutletId(record.outlet.id);

  if (!outletId) {
    throw new Error(`Outlet HRIS ${record.outlet.id} belum dimapping`);
  }

  if (!phone) {
    throw new Error("Nomor WhatsApp kosong di HRIS");
  }

  const existing = await prisma.staff.findUnique({
    where: { hrisStaffId },
  });

  const data = {
    name: record.name.trim(),
    waNumber: phone,
    outletId,
    position: resolveTaskPosition(record.position.name),
    role: mapHrisRole(record.role),
    status: mapHrisStatus(record.status),
    hrisStaffId,
    hrisEmployeeCode: record.employee_code.trim(),
    hrisOutletCode: record.outlet.id.trim(),
    hrisDivisionCode: record.division.id.trim(),
    hrisDivisionName: record.division.name,
    hrisPositionCode: record.position.id.trim(),
    hrisPositionName: record.position.name,
    hrisLinkStatus: "LINKED" as HrisLinkStatus,
    hrisSyncedAt: new Date(),
  };

  if (existing) {
    const wasActive = existing.status === "ACTIVE";
    await prisma.staff.update({
      where: { staffId: existing.staffId },
      data,
    });
    if (wasActive && data.status === "INACTIVE") return "deactivated";
    return "updated";
  }

  const localMatches = await prisma.staff.findMany({
    where: {
      hrisStaffId: null,
      outletId,
      waNumber: phone,
    },
  });

  if (localMatches.length === 1) {
    await prisma.staff.update({
      where: { staffId: localMatches[0].staffId },
      data,
    });
    return "updated";
  }

  if (localMatches.length > 1) {
    throw new Error("Beberapa staf lokal cocok WA+outlet — perlu review manual");
  }

  await prisma.staff.create({
    data: {
      staffId: generateStaffId(),
      loginEnabled: false,
      areaId: null,
      ...data,
    },
  });

  return "created";
}

async function backfillUnlinkedStaff(errors: string[]): Promise<void> {
  const unlinked = await prisma.staff.findMany({
    where: {
      hrisStaffId: null,
      hrisLinkStatus: { in: ["UNLINKED", "AMBIGUOUS"] },
    },
    include: { outlet: true },
  });

  for (const staff of unlinked) {
    const candidates: string[] = [];

    if (staff.hrisEmployeeCode) {
      const byCode = await prisma.staff.findMany({
        where: { hrisStaffId: staff.hrisEmployeeCode },
        select: { staffId: true },
      });
      if (byCode.length === 1 && byCode[0].staffId === staff.staffId) {
        await markLinked(staff.staffId, staff.hrisEmployeeCode);
        continue;
      }
    }

    const normalizedWa = normalizeHrisPhone(staff.waNumber);
    if (normalizedWa) {
      const matches = await prisma.staff.findMany({
        where: {
          waNumber: normalizedWa,
          outletId: staff.outletId,
          hrisStaffId: null,
        },
      });

      if (matches.length === 1 && matches[0].staffId === staff.staffId) {
        await prisma.staff.update({
          where: { staffId: staff.staffId },
          data: { hrisLinkStatus: "MANUAL_REVIEW" },
        });
        continue;
      }

      if (matches.length > 1) {
        await prisma.staff.update({
          where: { staffId: staff.staffId },
          data: { hrisLinkStatus: "AMBIGUOUS" },
        });
        errors.push(`${staff.staffId}: mapping ambigu (WA + outlet)`);
        continue;
      }
    }

    await prisma.staff.update({
      where: { staffId: staff.staffId },
      data: { hrisLinkStatus: "UNLINKED" },
    });
  }
}

async function markLinked(staffId: string, hrisStaffId: string) {
  await prisma.staff.update({
    where: { staffId },
    data: {
      hrisStaffId,
      hrisEmployeeCode: hrisStaffId,
      hrisLinkStatus: "LINKED",
      hrisSyncedAt: new Date(),
    },
  });
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

  const conflict = await prisma.staff.findFirst({
    where: { hrisStaffId, NOT: { staffId } },
    select: { staffId: true },
  });
  if (conflict) {
    throw new HrisApiError(
      "NIK HRIS sudah terhubung ke staf lain",
      "HRIS_STAFF_CONFLICT",
      409,
    );
  }

  await upsertStaffFromHris(remote);
  await prisma.staff.update({
    where: { staffId },
    data: {
      hrisStaffId: remote.id.trim(),
      hrisEmployeeCode: remote.employee_code.trim(),
      hrisLinkStatus: "LINKED",
      hrisSyncedAt: new Date(),
    },
  });
}

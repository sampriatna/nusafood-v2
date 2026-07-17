import { PrismaClient, SyncStatus } from "@prisma/client";
import {
  normalizeStaffRow,
  normalizeTaskRow,
  unwrapList,
  asString,
  normalizeOutletCode,
} from "./normalizers";

export interface SyncPayload {
  tasks?: unknown;
  staff?: unknown;
  areas?: unknown;
  categories?: unknown;
}

export interface SyncResult {
  tasks: { upserted: number; skipped: number };
  staff: { upserted: number; skipped: number };
  areas: { upserted: number; skipped: number };
  categories: { upserted: string[] };
  errors: string[];
}

async function resolveOutletId(
  prisma: PrismaClient,
  codeOrName: string,
  cache: Map<string, string>,
) {
  const code = normalizeOutletCode(codeOrName);
  if (cache.has(code)) return cache.get(code)!;

  let outlet = await prisma.outlet.findUnique({ where: { code } });
  if (!outlet) {
    outlet = await prisma.outlet.findFirst({
      where: { name: { equals: codeOrName, mode: "insensitive" } },
    });
  }
  if (!outlet) {
    outlet = await prisma.outlet.create({
      data: { code, name: codeOrName },
    });
  }
  cache.set(code, outlet.id);
  return outlet.id;
}

async function resolveAreaId(
  prisma: PrismaClient,
  outletId: string,
  areaName: string | null,
  cache: Map<string, string>,
) {
  if (!areaName) return null;
  const key = `${outletId}:${areaName.toLowerCase()}`;
  if (cache.has(key)) return cache.get(key)!;

  let area = await prisma.area.findUnique({
    where: { outletId_name: { outletId, name: areaName } },
  });
  if (!area) {
    area = await prisma.area.create({
      data: { outletId, name: areaName },
    });
  }
  cache.set(key, area.id);
  return area.id;
}

async function resolveCategoryId(
  prisma: PrismaClient,
  categoryName: string | null,
  cache: Map<string, string>,
) {
  if (!categoryName) return null;
  const key = categoryName.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;

  let category = await prisma.category.findUnique({
    where: { name: categoryName },
  });
  if (!category) {
    category = await prisma.category.create({
      data: { name: categoryName },
    });
  }
  cache.set(key, category.id);
  return category.id;
}

export async function syncPayloadToDb(
  prisma: PrismaClient,
  payload: SyncPayload,
  options?: { source?: string },
): Promise<SyncResult> {
  const result: SyncResult = {
    tasks: { upserted: 0, skipped: 0 },
    staff: { upserted: 0, skipped: 0 },
    areas: { upserted: 0, skipped: 0 },
    categories: { upserted: [] },
    errors: [],
  };

  const outletCache = new Map<string, string>();
  const areaCache = new Map<string, string>();
  const categoryCache = new Map<string, string>();
  const source = options?.source ?? "sync";

  // Categories
  for (const row of unwrapList(payload.categories, [
    "categories",
    "data",
    "rows",
    "items",
  ])) {
    const name = asString(row.name ?? row.category ?? Object.values(row)[0]);
    if (!name) continue;
    await prisma.category.upsert({
      where: { name },
      create: { name },
      update: { isActive: true },
    });
    result.categories.upserted.push(name);
  }

  // Areas (optional outlet-scoped)
  for (const row of unwrapList(payload.areas, ["areas", "data", "rows", "items"])) {
    const name = asString(row.name ?? row.area);
    if (!name) {
      result.areas.skipped += 1;
      continue;
    }
    const outletCode = normalizeOutletCode(row.outlet ?? row.outlet_code ?? "KBU");
    try {
      const outletId = await resolveOutletId(prisma, outletCode, outletCache);
      await prisma.area.upsert({
        where: { outletId_name: { outletId, name } },
        create: { outletId, name },
        update: { isActive: true },
      });
      result.areas.upserted += 1;
    } catch (error) {
      result.areas.skipped += 1;
      result.errors.push(
        `area ${name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Staff
  for (const row of unwrapList(payload.staff, ["staff", "data", "rows", "items"])) {
    const normalized = normalizeStaffRow(row);
    if (!normalized) {
      result.staff.skipped += 1;
      continue;
    }
    try {
      const outletId = await resolveOutletId(
        prisma,
        normalized.outletCode,
        outletCache,
      );
      const areaId = await resolveAreaId(
        prisma,
        outletId,
        normalized.areaName,
        areaCache,
      );

      // Skip staff_id FK on tasks if staff not yet present — create staff first
      await prisma.staff.upsert({
        where: { staffId: normalized.staffId },
        create: {
          staffId: normalized.staffId,
          name: normalized.name,
          position: normalized.position,
          outletId,
          areaId,
          waNumber: normalized.waNumber,
          role: normalized.role,
          status: normalized.status,
          loginEnabled: normalized.loginEnabled,
        },
        update: {
          name: normalized.name,
          position: normalized.position,
          outletId,
          areaId,
          waNumber: normalized.waNumber,
          role: normalized.role,
          status: normalized.status,
          loginEnabled: normalized.loginEnabled,
        },
      });
      result.staff.upserted += 1;
    } catch (error) {
      result.staff.skipped += 1;
      result.errors.push(
        `staff ${normalized.staffId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Tasks
  for (const row of unwrapList(payload.tasks, ["tasks", "data", "rows", "items"])) {
    const normalized = normalizeTaskRow(row);
    if (!normalized) {
      result.tasks.skipped += 1;
      continue;
    }
    try {
      const outletId = await resolveOutletId(
        prisma,
        normalized.outletCode,
        outletCache,
      );
      const areaId = await resolveAreaId(
        prisma,
        outletId,
        normalized.areaName,
        areaCache,
      );
      const categoryId = await resolveCategoryId(
        prisma,
        normalized.categoryName,
        categoryCache,
      );

      let staffId = normalized.staffId;
      if (staffId) {
        const exists = await prisma.staff.findUnique({
          where: { staffId },
        });
        if (!exists) staffId = null;
      }

      const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });

      await prisma.task.upsert({
        where: { taskId: normalized.taskId },
        create: {
          taskId: normalized.taskId,
          token: normalized.token,
          createdBy: normalized.createdBy,
          outletId,
          areaId,
          categoryId,
          outletName: outlet?.name ?? normalized.outletCode,
          areaName: normalized.areaName,
          categoryName: normalized.categoryName,
          taskTitle: normalized.taskTitle,
          taskDescription: normalized.taskDescription,
          priority: normalized.priority,
          picName: normalized.picName,
          picWa: normalized.picWa,
          staffId,
          deadline: normalized.deadline,
          beforePhotoUrl: normalized.beforePhotoUrl,
          status: normalized.status,
          reportLink: normalized.reportLink,
          waSentAt: normalized.waSentAt,
          openedAt: normalized.openedAt,
          submittedAt: normalized.submittedAt,
          afterPhotoUrl: normalized.afterPhotoUrl,
          staffNote: normalized.staffNote,
          leaderVerification: normalized.leaderVerification,
          verifiedBy: normalized.verifiedBy,
          verifiedAt: normalized.verifiedAt,
          finalStatus: normalized.finalStatus,
          isLate: normalized.isLate,
          durationMinutes: normalized.durationMinutes,
          checklistMode: normalized.checklistMode,
          recurringTemplateId: normalized.recurringTemplateId,
          sourceVersion: "v1",
          gasSyncedAt: new Date(),
          ...(normalized.createdAt ? { createdAt: normalized.createdAt } : {}),
        },
        update: {
          token: normalized.token,
          createdBy: normalized.createdBy,
          outletId,
          areaId,
          categoryId,
          outletName: outlet?.name ?? normalized.outletCode,
          areaName: normalized.areaName,
          categoryName: normalized.categoryName,
          taskTitle: normalized.taskTitle,
          taskDescription: normalized.taskDescription,
          priority: normalized.priority,
          picName: normalized.picName,
          picWa: normalized.picWa,
          staffId,
          deadline: normalized.deadline,
          beforePhotoUrl: normalized.beforePhotoUrl,
          status: normalized.status,
          reportLink: normalized.reportLink,
          waSentAt: normalized.waSentAt,
          openedAt: normalized.openedAt,
          submittedAt: normalized.submittedAt,
          afterPhotoUrl: normalized.afterPhotoUrl,
          staffNote: normalized.staffNote,
          leaderVerification: normalized.leaderVerification,
          verifiedBy: normalized.verifiedBy,
          verifiedAt: normalized.verifiedAt,
          finalStatus: normalized.finalStatus,
          isLate: normalized.isLate,
          durationMinutes: normalized.durationMinutes,
          checklistMode: normalized.checklistMode,
          recurringTemplateId: normalized.recurringTemplateId,
          sourceVersion: "v1",
          gasSyncedAt: new Date(),
        },
      });
      result.tasks.upserted += 1;
    } catch (error) {
      result.tasks.skipped += 1;
      result.errors.push(
        `task ${normalized.taskId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const overall: SyncStatus =
    result.errors.length === 0
      ? "success"
      : result.tasks.upserted + result.staff.upserted > 0
        ? "partial"
        : "failed";

  await prisma.syncLog.create({
    data: {
      operation: source,
      entityType: "batch",
      entityId: null,
      v1Status: "success",
      v2Status: overall,
      v2Response: result as object,
      errorMessage:
        result.errors.length > 0 ? result.errors.slice(0, 20).join("; ") : null,
    },
  });

  return result;
}

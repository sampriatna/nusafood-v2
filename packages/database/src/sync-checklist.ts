import { PrismaClient, SyncStatus } from "@prisma/client";
import {
  normalizeChecklistItemRow,
  normalizeChecklistTemplateRow,
  normalizeOutletCode,
  normalizeRecurringTemplateRow,
  unwrapList,
  asString,
} from "./normalizers";

export interface ChecklistSyncPayload {
  checklist_templates?: unknown;
  checklist_items?: unknown;
  recurring_templates?: unknown;
}

export interface ChecklistSyncResult {
  checklistTemplates: { upserted: number; skipped: number };
  checklistItems: { upserted: number; skipped: number };
  recurringTemplates: { upserted: number; skipped: number };
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

export async function syncChecklistPayloadToDb(
  prisma: PrismaClient,
  payload: ChecklistSyncPayload,
  options?: { source?: string },
): Promise<ChecklistSyncResult> {
  const result: ChecklistSyncResult = {
    checklistTemplates: { upserted: 0, skipped: 0 },
    checklistItems: { upserted: 0, skipped: 0 },
    recurringTemplates: { upserted: 0, skipped: 0 },
    errors: [],
  };

  const outletCache = new Map<string, string>();
  const areaCache = new Map<string, string>();
  const categoryCache = new Map<string, string>();
  const source = options?.source ?? "checklist-sync";
  const migratedTemplateIds = new Set<string>();

  // Checklist templates
  for (const row of unwrapList(payload.checklist_templates, [
    "checklist_templates",
    "templates",
    "data",
    "rows",
    "items",
  ])) {
    const normalized = normalizeChecklistTemplateRow(row);
    if (!normalized) {
      result.checklistTemplates.skipped += 1;
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

      await prisma.checklistTemplate.upsert({
        where: { templateId: normalized.templateId },
        create: {
          templateId: normalized.templateId,
          templateName: normalized.templateName,
          outletId,
          areaId,
          taskTitle: normalized.taskTitle,
          checklistTitle: normalized.checklistTitle,
          picName: normalized.picName,
          picWa: normalized.picWa,
          requiresPhoto: normalized.requiresPhoto,
          activeStatus: normalized.activeStatus,
          ...(normalized.createdAt ? { createdAt: normalized.createdAt } : {}),
          ...(normalized.updatedAt ? { updatedAt: normalized.updatedAt } : {}),
        },
        update: {
          templateName: normalized.templateName,
          outletId,
          areaId,
          taskTitle: normalized.taskTitle,
          checklistTitle: normalized.checklistTitle,
          picName: normalized.picName,
          picWa: normalized.picWa,
          requiresPhoto: normalized.requiresPhoto,
          activeStatus: normalized.activeStatus,
          ...(normalized.updatedAt ? { updatedAt: normalized.updatedAt } : {}),
        },
      });

      migratedTemplateIds.add(normalized.templateId);
      result.checklistTemplates.upserted += 1;
    } catch (error) {
      result.checklistTemplates.skipped += 1;
      result.errors.push(
        `checklist_template ${normalized.templateId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Checklist items
  for (const row of unwrapList(payload.checklist_items, [
    "checklist_items",
    "items",
    "data",
    "rows",
  ])) {
    const normalized = normalizeChecklistItemRow(row);
    if (!normalized) {
      result.checklistItems.skipped += 1;
      continue;
    }

    if (
      migratedTemplateIds.size > 0 &&
      !migratedTemplateIds.has(normalized.templateId)
    ) {
      const exists = await prisma.checklistTemplate.findUnique({
        where: { templateId: normalized.templateId },
        select: { templateId: true },
      });
      if (!exists) {
        result.checklistItems.skipped += 1;
        result.errors.push(
          `checklist_item ${normalized.checklistItemId}: template ${normalized.templateId} tidak ada`,
        );
        continue;
      }
    }

    try {
      await prisma.checklistItem.upsert({
        where: { checklistItemId: normalized.checklistItemId },
        create: {
          checklistItemId: normalized.checklistItemId,
          templateId: normalized.templateId,
          itemOrder: normalized.itemOrder,
          itemText: normalized.itemText,
          requiresPhoto: normalized.requiresPhoto,
          isRequired: normalized.isRequired,
          activeStatus: normalized.activeStatus,
          ...(normalized.createdAt ? { createdAt: normalized.createdAt } : {}),
          ...(normalized.updatedAt ? { updatedAt: normalized.updatedAt } : {}),
        },
        update: {
          templateId: normalized.templateId,
          itemOrder: normalized.itemOrder,
          itemText: normalized.itemText,
          requiresPhoto: normalized.requiresPhoto,
          isRequired: normalized.isRequired,
          activeStatus: normalized.activeStatus,
          ...(normalized.updatedAt ? { updatedAt: normalized.updatedAt } : {}),
        },
      });
      result.checklistItems.upserted += 1;
    } catch (error) {
      result.checklistItems.skipped += 1;
      result.errors.push(
        `checklist_item ${normalized.checklistItemId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Recurring templates
  for (const row of unwrapList(payload.recurring_templates, [
    "recurring_templates",
    "templates",
    "data",
    "rows",
    "items",
  ])) {
    const normalized = normalizeRecurringTemplateRow(row);
    if (!normalized) {
      result.recurringTemplates.skipped += 1;
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

      await prisma.recurringTemplate.upsert({
        where: { templateId: normalized.templateId },
        create: {
          templateId: normalized.templateId,
          templateName: normalized.templateName,
          outletId,
          areaId,
          categoryId,
          picName: normalized.picName,
          picWa: normalized.picWa,
          staffId,
          taskTitle: normalized.taskTitle,
          taskDescription: normalized.taskDescription,
          repeatType: normalized.repeatType,
          repeatDays: normalized.repeatDays,
          repeatTime: normalized.repeatTime,
          deadlineTime: normalized.deadlineTime,
          requiresPhoto: normalized.requiresPhoto,
          activeStatus: normalized.activeStatus,
          templateVersion: normalized.templateVersion,
          ...(normalized.createdAt ? { createdAt: normalized.createdAt } : {}),
          ...(normalized.updatedAt ? { updatedAt: normalized.updatedAt } : {}),
        },
        update: {
          templateName: normalized.templateName,
          outletId,
          areaId,
          categoryId,
          picName: normalized.picName,
          picWa: normalized.picWa,
          staffId,
          taskTitle: normalized.taskTitle,
          taskDescription: normalized.taskDescription,
          repeatType: normalized.repeatType,
          repeatDays: normalized.repeatDays,
          repeatTime: normalized.repeatTime,
          deadlineTime: normalized.deadlineTime,
          requiresPhoto: normalized.requiresPhoto,
          activeStatus: normalized.activeStatus,
          templateVersion: normalized.templateVersion,
          ...(normalized.updatedAt ? { updatedAt: normalized.updatedAt } : {}),
        },
      });
      result.recurringTemplates.upserted += 1;
    } catch (error) {
      result.recurringTemplates.skipped += 1;
      result.errors.push(
        `recurring_template ${normalized.templateId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const overall: SyncStatus =
    result.errors.length === 0
      ? "success"
      : result.checklistTemplates.upserted +
            result.checklistItems.upserted +
            result.recurringTemplates.upserted >
          0
        ? "partial"
        : "failed";

  await prisma.syncLog.create({
    data: {
      operation: source,
      entityType: "checklist_batch",
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

/** Flatten templates that embed items[] (some GAS exports). */
export function flattenChecklistPayload(payload: ChecklistSyncPayload): ChecklistSyncPayload {
  const templates = unwrapList(payload.checklist_templates, [
    "checklist_templates",
    "templates",
    "data",
    "rows",
    "items",
  ]);
  const standaloneItems = unwrapList(payload.checklist_items, [
    "checklist_items",
    "items",
    "data",
    "rows",
  ]);

  const embeddedItems: Record<string, unknown>[] = [];
  const flatTemplates = templates.map((row) => {
    const items = row.items;
    if (Array.isArray(items)) {
      for (const item of items) {
        embeddedItems.push({
          ...(typeof item === "object" && item !== null
            ? (item as Record<string, unknown>)
            : {}),
          template_id:
            asString(
              (item as Record<string, unknown>)?.template_id ??
                row.template_id ??
                row.templateId,
            ) || undefined,
        });
      }
    }
    const { items: _items, ...rest } = row;
    return rest;
  });

  return {
    checklist_templates: flatTemplates,
    checklist_items:
      standaloneItems.length > 0 ? standaloneItems : embeddedItems,
    recurring_templates: payload.recurring_templates,
  };
}

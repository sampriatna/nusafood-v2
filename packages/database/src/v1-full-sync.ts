import type { PrismaClient } from "@prisma/client";
import {
  flattenChecklistPayload,
  syncChecklistPayloadToDb,
  type ChecklistSyncPayload,
  type ChecklistSyncResult,
} from "./sync-checklist";
import { syncPayloadToDb, type SyncPayload, type SyncResult } from "./sync";
import { asString, unwrapList } from "./normalizers";

export interface V1FullSyncResult {
  source: string;
  operational: SyncResult;
  checklist: ChecklistSyncResult;
}

function isTestTemplate(row: Record<string, unknown>): boolean {
  const name = asString(row.template_name ?? row.templateName);
  const outlet = asString(row.outlet ?? row.outlet_code);
  return (
    name.startsWith("[ZZTEST]") ||
    outlet.startsWith("ZZ_TEST") ||
    outlet === "ZZ_TEST_OUTLET"
  );
}

function recurringToChecklistTemplate(
  row: Record<string, unknown>,
): Record<string, unknown> {
  const templateId = asString(row.template_id ?? row.templateId);
  const templateName = asString(row.template_name ?? row.templateName);
  const taskTitle = asString(row.task_title ?? row.taskTitle);

  return {
    template_id: templateId,
    template_name: templateName,
    outlet: row.outlet,
    area: row.area,
    task_title: taskTitle || templateName,
    checklist_title: taskTitle || templateName,
    pic_name: row.pic_name ?? row.picName,
    pic_wa: row.pic_wa ?? row.picWa,
    requires_photo: row.requires_photo ?? row.requiresPhoto,
    active_status: row.active_status ?? row.activeStatus,
    created_at: row.created_at ?? row.createdAt,
    updated_at: row.updated_at ?? row.updatedAt,
  };
}

export type GasCaller = (
  action: string,
  params?: Record<string, string>,
) => Promise<{ success: boolean; data?: unknown; error?: string }>;

/** Build checklist payload from v1 GAS (recurring + items). */
export async function loadChecklistPayloadFromGas(
  callGas: GasCaller,
): Promise<ChecklistSyncPayload> {
  const recurringRes = await callGas("getRecurringTemplates");
  if (!recurringRes.success) {
    throw new Error(recurringRes.error || "getRecurringTemplates gagal");
  }

  const recurring = unwrapList(recurringRes.data, [
    "recurring_templates",
    "templates",
    "data",
    "rows",
    "items",
  ]).filter((row) => !isTestTemplate(row));

  let legacyTemplates: Record<string, unknown>[] = [];
  const legacyRes = await callGas("getChecklistTemplates");
  if (legacyRes.success && legacyRes.data) {
    legacyTemplates = unwrapList(legacyRes.data, [
      "checklist_templates",
      "templates",
      "data",
      "rows",
      "items",
    ]).filter((row) => !isTestTemplate(row));
  }

  const checklistTemplates = [
    ...legacyTemplates,
    ...recurring.map(recurringToChecklistTemplate),
  ];

  const templateIds = new Set<string>();
  for (const row of checklistTemplates) {
    const id = asString(row.template_id ?? row.templateId);
    if (id) templateIds.add(id);
  }

  const allItems: Record<string, unknown>[] = [];
  for (const templateId of templateIds) {
    const itemsRes = await callGas("getChecklistItems", { template_id: templateId });
    if (!itemsRes.success || !itemsRes.data) continue;
    allItems.push(...unwrapList(itemsRes.data, ["items", "data", "rows"]));
  }

  return flattenChecklistPayload({
    checklist_templates: checklistTemplates,
    checklist_items: allItems,
    recurring_templates: recurring,
  });
}

/** Load operational master payload from v1 GAS. */
export async function loadOperationalPayloadFromGas(
  callGas: GasCaller,
): Promise<SyncPayload> {
  const [tasksRes, staffRes, areasRes, categoriesRes] = await Promise.all([
    callGas("getTasks"),
    callGas("getStaff"),
    callGas("getAreas"),
    callGas("getCategories"),
  ]);

  if (!tasksRes.success) {
    throw new Error(tasksRes.error || "getTasks gagal");
  }
  if (!staffRes.success) {
    throw new Error(staffRes.error || "getStaff gagal");
  }
  if (!areasRes.success) {
    throw new Error(areasRes.error || "getAreas gagal");
  }
  if (!categoriesRes.success) {
    throw new Error(categoriesRes.error || "getCategories gagal");
  }

  return {
    tasks: tasksRes.data,
    staff: staffRes.data,
    areas: areasRes.data,
    categories: categoriesRes.data,
  };
}

export async function syncAllFromV1Payloads(
  prisma: PrismaClient,
  operational: SyncPayload,
  checklist: ChecklistSyncPayload,
  source: string,
): Promise<V1FullSyncResult> {
  const opResult = await syncPayloadToDb(prisma, operational, {
    source: `${source}:operational`,
  });
  const checklistResult = await syncChecklistPayloadToDb(
    prisma,
    flattenChecklistPayload(checklist),
    { source: `${source}:checklist` },
  );

  return {
    source,
    operational: opResult,
    checklist: checklistResult,
  };
}

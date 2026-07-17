/**
 * Migrate checklist + recurring templates from v1 (GAS / JSON export) → PostgreSQL v2.
 *
 * Modes:
 * 1) JSON fixture (dev / manual export):
 *    pnpm migrate:checklist-from-v1 -- --file scripts/fixtures/sample-checklist-sync.json
 * 2) GAS Web App (production v1):
 *    GAS_WEB_APP_URL=... ADMIN_API_KEY=... pnpm migrate:checklist-from-v1 -- --gas
 *
 * Production v1 stores checklist items on recurring templates (TPL-*).
 * GAS auth uses query param `admin_secret` (same value as ADMIN_API_KEY env).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  flattenChecklistPayload,
  syncChecklistPayloadToDb,
  type ChecklistSyncPayload,
} from "../packages/database/src/sync-checklist";
import { unwrapList, asString } from "../packages/database/src/normalizers";

const prisma = new PrismaClient();

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function loadFromFile(filePath: string): Promise<ChecklistSyncPayload> {
  const abs = path.resolve(process.cwd(), filePath);
  const raw = await readFile(abs, "utf8");
  return JSON.parse(raw) as ChecklistSyncPayload;
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

async function callGas(
  action: string,
  params?: Record<string, string>,
): Promise<unknown> {
  const base = process.env.GAS_WEB_APP_URL;
  const key = process.env.ADMIN_API_KEY;
  if (!base || base.includes("...")) {
    throw new Error("GAS_WEB_APP_URL belum dikonfigurasi");
  }

  const url = new URL(base);
  url.searchParams.set("action", action);
  if (key && !key.includes("your-gas")) {
    // v1 GAS validates `admin_secret` on GET (not `api_key`)
    url.searchParams.set("admin_secret", key);
  }
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`GAS ${action} HTTP ${res.status}`);
  }

  const body = (await res.json()) as {
    success?: boolean;
    data?: unknown;
    error?: string;
    message?: string;
  };

  if (body.success === false) {
    throw new Error(
      body.message || body.error || `GAS ${action} gagal`,
    );
  }

  return body.data ?? body;
}

async function loadFromGas(): Promise<ChecklistSyncPayload> {
  console.log("[migrate] Fetching recurring templates from GAS…");
  const recurringRaw = await callGas("getRecurringTemplates");
  const recurring = unwrapList(recurringRaw, [
    "recurring_templates",
    "templates",
    "data",
    "rows",
    "items",
  ]).filter((row) => !isTestTemplate(row));

  console.log(`[migrate] Found ${recurring.length} recurring template(s)`);

  // Legacy sheet export (optional — not deployed on all v1 instances)
  let legacyTemplates: Record<string, unknown>[] = [];
  try {
    const templatesRaw = await callGas("getChecklistTemplates");
    legacyTemplates = unwrapList(templatesRaw, [
      "checklist_templates",
      "templates",
      "data",
      "rows",
      "items",
    ]).filter((row) => !isTestTemplate(row));
    if (legacyTemplates.length > 0) {
      console.log(
        `[migrate] Also found ${legacyTemplates.length} legacy checklist template(s)`,
      );
    }
  } catch (error) {
    console.log(
      "[migrate] getChecklistTemplates tidak tersedia — pakai recurring + items",
    );
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
    console.log(`[migrate] Fetching items for ${templateId}…`);
    try {
      const itemsRaw = await callGas("getChecklistItems", {
        template_id: templateId,
      });
      const items = unwrapList(itemsRaw, ["items", "data", "rows"]);
      allItems.push(...items);
      console.log(`[migrate]   → ${items.length} item(s)`);
    } catch (error) {
      console.warn(
        `[migrate]   → skip items: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  return {
    checklist_templates: checklistTemplates,
    checklist_items: allItems,
    recurring_templates: recurring,
  };
}

async function assertDatabaseReachable() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `DATABASE_URL tidak valid atau Supabase menolak koneksi. Update .env dari Supabase Dashboard (Settings → Database), lalu coba lagi.\n${message}`,
    );
  }
}

async function main() {
  const file = getArg("--file") ?? process.env.CHECKLIST_SYNC_FILE;
  const useGas = process.argv.includes("--gas");
  const dryRun = process.argv.includes("--dry-run");
  const exportPath = getArg("--export");

  let payload: ChecklistSyncPayload;
  let source: string;

  if (file) {
    console.log(`[migrate] Loading fixture: ${file}`);
    payload = await loadFromFile(file);
    source = `fixture:${path.basename(file)}`;
  } else if (useGas || process.env.GAS_WEB_APP_URL) {
    payload = await loadFromGas();
    source =
      "gas:getRecurringTemplates+getChecklistItems(+getChecklistTemplates)";
  } else {
    const fallback = "scripts/fixtures/sample-checklist-sync.json";
    console.log(`[migrate] No --file/--gas; using ${fallback}`);
    payload = await loadFromFile(fallback);
    source = `fixture:${path.basename(fallback)}`;
  }

  payload = flattenChecklistPayload(payload);

  const templateCount = unwrapList(payload.checklist_templates).length;
  const itemCount = unwrapList(payload.checklist_items).length;
  const recurringCount = unwrapList(payload.recurring_templates).length;

  console.log(
    `[migrate] Payload: ${templateCount} template(s), ${itemCount} item(s), ${recurringCount} recurring`,
  );

  if (dryRun) {
    console.log(
      JSON.stringify(
        { source, dryRun: true, counts: { templateCount, itemCount, recurringCount } },
        null,
        2,
      ),
    );
    return;
  }

  if (exportPath) {
    const { writeFile } = await import("node:fs/promises");
    const abs = path.resolve(process.cwd(), exportPath);
    await writeFile(abs, JSON.stringify(payload, null, 2), "utf8");
    console.log(JSON.stringify({ source, exported: abs, counts: { templateCount, itemCount, recurringCount } }, null, 2));
    return;
  }

  await assertDatabaseReachable();
  console.log("[migrate] Database OK — writing to Supabase…");

  const result = await syncChecklistPayloadToDb(prisma, payload, { source });
  console.log(JSON.stringify({ source, result }, null, 2));

  if (result.errors.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("[migrate] failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

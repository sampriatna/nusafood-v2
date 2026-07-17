/**
 * Migrate checklist + recurring templates from v1 (GAS / JSON export) → PostgreSQL v2.
 *
 * Modes:
 * 1) JSON fixture (dev / manual export):
 *    pnpm migrate:checklist-from-v1 -- --file scripts/fixtures/sample-checklist-sync.json
 * 2) GAS Web App (production v1):
 *    GAS_WEB_APP_URL=... ADMIN_API_KEY=... pnpm migrate:checklist-from-v1 -- --gas
 *
 * Tidak menulis ke v1. Repo v0-field-task-app tidak disentuh.
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
    url.searchParams.set("api_key", key);
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
  };

  if (body.success === false) {
    throw new Error(body.error || `GAS ${action} gagal`);
  }

  return body.data ?? body;
}

async function loadFromGas(): Promise<ChecklistSyncPayload> {
  console.log("[migrate] Fetching checklist templates from GAS…");
  const templatesRaw = await callGas("getChecklistTemplates");
  const templates = unwrapList(templatesRaw, [
    "checklist_templates",
    "templates",
    "data",
    "rows",
    "items",
  ]);

  console.log(`[migrate] Found ${templates.length} checklist template(s)`);

  const allItems: Record<string, unknown>[] = [];
  for (const row of templates) {
    const templateId = asString(row.template_id ?? row.templateId);
    if (!templateId) continue;

    console.log(`[migrate] Fetching items for ${templateId}…`);
    const itemsRaw = await callGas("getChecklistItems", {
      template_id: templateId,
    });
    const items = unwrapList(itemsRaw, ["items", "data", "rows"]);
    allItems.push(...items);
  }

  console.log("[migrate] Fetching recurring templates from GAS…");
  let recurring: unknown[] = [];
  try {
    const recurringRaw = await callGas("getRecurringTemplates");
    recurring = unwrapList(recurringRaw, [
      "recurring_templates",
      "templates",
      "data",
      "rows",
      "items",
    ]);
  } catch (error) {
    console.warn(
      "[migrate] getRecurringTemplates gagal (opsional):",
      error instanceof Error ? error.message : error,
    );
  }

  return {
    checklist_templates: templates,
    checklist_items: allItems,
    recurring_templates: recurring,
  };
}

async function main() {
  const file = getArg("--file") ?? process.env.CHECKLIST_SYNC_FILE;
  const useGas = process.argv.includes("--gas");
  const dryRun = process.argv.includes("--dry-run");

  let payload: ChecklistSyncPayload;
  let source: string;

  if (file) {
    console.log(`[migrate] Loading fixture: ${file}`);
    payload = await loadFromFile(file);
    source = `fixture:${path.basename(file)}`;
  } else if (useGas || process.env.GAS_WEB_APP_URL) {
    payload = await loadFromGas();
    source = "gas:getChecklistTemplates+getChecklistItems+getRecurringTemplates";
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
    console.log(JSON.stringify({ source, dryRun: true, counts: { templateCount, itemCount, recurringCount } }, null, 2));
    return;
  }

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

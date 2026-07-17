/**
 * Full v1 → v2 sync: master data, tasks, recurring, checklist templates/items.
 *
 *   pnpm sync:all-from-v1 -- --gas
 *   pnpm sync:all-from-v1 -- --file scripts/fixtures/v1-full-export.json
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  loadChecklistPayloadFromGas,
  loadOperationalPayloadFromGas,
  syncAllFromV1Payloads,
} from "../packages/database/src/v1-full-sync";
import type { ChecklistSyncPayload } from "../packages/database/src/sync-checklist";
import type { SyncPayload } from "../packages/database/src/sync";

const prisma = new PrismaClient();

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function callGas(
  action: string,
  params?: Record<string, string>,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const base = process.env.GAS_WEB_APP_URL;
  const key = process.env.ADMIN_API_KEY;
  if (!base || base.includes("...")) {
    throw new Error("GAS_WEB_APP_URL belum dikonfigurasi");
  }

  const url = new URL(base);
  url.searchParams.set("action", action);
  if (key && !key.includes("your-gas")) {
    url.searchParams.set("admin_secret", key);
  }
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), { method: "GET", redirect: "follow" });
  if (!res.ok) {
    return { success: false, error: `GAS ${action} HTTP ${res.status}` };
  }

  const body = (await res.json()) as {
    success?: boolean;
    data?: unknown;
    error?: string;
    message?: string;
  };

  if (body.success === false) {
    return {
      success: false,
      error: body.message || body.error || `GAS ${action} gagal`,
    };
  }

  return { success: true, data: body.data ?? body };
}

async function loadFromFile(filePath: string): Promise<{
  operational: SyncPayload;
  checklist: ChecklistSyncPayload;
}> {
  const abs = path.resolve(process.cwd(), filePath);
  const raw = JSON.parse(await readFile(abs, "utf8")) as SyncPayload &
    ChecklistSyncPayload;
  const { tasks, staff, areas, categories, ...checklistRest } = raw;
  return {
    operational: { tasks, staff, areas, categories },
    checklist: checklistRest,
  };
}

async function main() {
  const file = getArg("--file");
  const useGas = process.argv.includes("--gas");
  let source: string;
  let operational: SyncPayload;
  let checklist: ChecklistSyncPayload;

  if (file) {
    console.log(`[sync-all] Loading fixture: ${file}`);
    ({ operational, checklist } = await loadFromFile(file));
    source = `fixture:${path.basename(file)}`;
  } else if (useGas || process.env.GAS_WEB_APP_URL) {
    console.log("[sync-all] Loading from GAS…");
    [operational, checklist] = await Promise.all([
      loadOperationalPayloadFromGas(callGas),
      loadChecklistPayloadFromGas(callGas),
    ]);
    source = "gas:full-sync";
  } else {
    throw new Error("Pakai --gas atau --file path/to/export.json");
  }

  await prisma.$queryRaw`SELECT 1`;
  const result = await syncAllFromV1Payloads(
    prisma,
    operational,
    checklist,
    source,
  );
  console.log(JSON.stringify(result, null, 2));

  const errors = [
    ...result.operational.errors,
    ...result.checklist.errors,
  ];
  if (errors.length > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("[sync-all] failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

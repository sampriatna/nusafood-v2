/**
 * Read-only sync: GAS / Sheets export → PostgreSQL v2.
 *
 * Modes:
 * 1) JSON fixture (default for lokal/dev):
 *    pnpm sync:from-gas -- --file scripts/fixtures/sample-sync.json
 * 2) GAS Web App (jika env terisi):
 *    GAS_WEB_APP_URL=... ADMIN_API_KEY=... pnpm sync:from-gas
 *
 * Tidak menulis ke v1. Repo v0-field-task-app tidak disentuh.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { syncPayloadToDb, type SyncPayload } from "../packages/database/src/sync";

const prisma = new PrismaClient();

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function loadFromFile(filePath: string): Promise<SyncPayload> {
  const abs = path.resolve(process.cwd(), filePath);
  const raw = await readFile(abs, "utf8");
  return JSON.parse(raw) as SyncPayload;
}

async function callGas(action: string): Promise<unknown> {
  const base = process.env.GAS_WEB_APP_URL;
  const key = process.env.ADMIN_API_KEY;
  if (!base || base.includes("...")) {
    throw new Error("GAS_WEB_APP_URL belum dikonfigurasi");
  }

  const url = new URL(base);
  url.searchParams.set("action", action);
  if (key) url.searchParams.set("api_key", key);

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

async function loadFromGas(): Promise<SyncPayload> {
  const [tasks, staff, areas, categories] = await Promise.all([
    callGas("getTasks"),
    callGas("getStaff"),
    callGas("getAreas"),
    callGas("getCategories"),
  ]);

  return { tasks, staff, areas, categories };
}

async function main() {
  const file = getArg("--file") ?? process.env.SYNC_FILE;
  const useGas = process.argv.includes("--gas");

  let payload: SyncPayload;
  let source: string;

  if (file) {
    console.log(`[sync] Loading fixture: ${file}`);
    payload = await loadFromFile(file);
    source = `fixture:${path.basename(file)}`;
  } else if (useGas || process.env.GAS_WEB_APP_URL) {
    console.log("[sync] Loading from GAS…");
    payload = await loadFromGas();
    source = "gas:getTasks+getStaff+getAreas+getCategories";
  } else {
    const fallback = "scripts/fixtures/sample-sync.json";
    console.log(`[sync] No --file/--gas; using ${fallback}`);
    payload = await loadFromFile(fallback);
    source = `fixture:${path.basename(fallback)}`;
  }

  const result = await syncPayloadToDb(prisma, payload, { source });
  console.log(JSON.stringify({ source, result }, null, 2));

  if (result.errors.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("[sync] failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

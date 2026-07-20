/**
 * Photo storage — Supabase Storage jika dikonfigurasi,
 * fallback lokal ke public/uploads (dev / tanpa credentials).
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

export type StorageHealth = "ok" | "degraded" | "down" | "skipped";

export type UploadContext =
  | "before"
  | "after"
  | "checklist_item"
  | "daily_report"
  | "disciplinary";

export interface UploadResult {
  url: string;
  size_bytes: number;
  storage: "supabase" | "local";
  path: string;
}

function supabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(url && key && !url.includes("xxx"));
}

export async function checkStorageHealth(): Promise<StorageHealth> {
  if (!supabaseConfigured()) {
    return "skipped";
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${url.replace(/\/$/, "")}/storage/v1/bucket`, {
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok ? "ok" : "degraded";
  } catch {
    return "down";
  }
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

async function uploadToSupabase(
  bytes: Buffer,
  contentType: string,
  objectPath: string,
): Promise<UploadResult> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const bucket = process.env.STORAGE_BUCKET || "nusafood-photos";

  const res = await fetch(
    `${base}/storage/v1/object/${bucket}/${objectPath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: new Uint8Array(bytes),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase upload gagal (${res.status}): ${text.slice(0, 200)}`);
  }

  const publicUrl = `${base}/storage/v1/object/public/${bucket}/${objectPath}`;
  return {
    url: publicUrl,
    size_bytes: bytes.length,
    storage: "supabase",
    path: objectPath,
  };
}

async function uploadLocal(
  bytes: Buffer,
  objectPath: string,
): Promise<UploadResult> {
  const publicDir = path.join(process.cwd(), "public", "uploads");
  const fullPath = path.join(publicDir, objectPath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, bytes);

  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const urlPath = `/uploads/${objectPath.split(path.sep).join("/")}`;

  return {
    url: origin ? `${origin}${urlPath}` : urlPath,
    size_bytes: bytes.length,
    storage: "local",
    path: objectPath,
  };
}

export async function uploadPhoto(input: {
  bytes: Buffer;
  contentType: string;
  taskId: string;
  context: UploadContext;
  originalName?: string;
}): Promise<UploadResult> {
  const ext =
    input.contentType === "image/png"
      ? "png"
      : input.contentType === "image/webp"
        ? "webp"
        : "jpg";
  const stamp = Date.now();
  const rand = randomBytes(4).toString("hex");
  const objectPath = `${safeSegment(input.taskId)}/${input.context}-${stamp}-${rand}.${ext}`;

  if (supabaseConfigured()) {
    return uploadToSupabase(input.bytes, input.contentType, objectPath);
  }

  return uploadLocal(input.bytes, objectPath);
}

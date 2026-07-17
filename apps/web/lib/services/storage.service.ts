/**
 * Photo storage service (Supabase Storage / Cloudinary).
 * Full upload flow in Sprint 4.
 */

export type StorageHealth = "ok" | "degraded" | "down" | "skipped";

export async function checkStorageHealth(): Promise<StorageHealth> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key || url.includes("xxx")) {
    return "skipped";
  }

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

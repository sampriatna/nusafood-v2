import { fail, ok } from "@/lib/api/response";
import { runSyncPayload } from "@/lib/services/sync.service";
import type { SyncPayload } from "@nusafood/database/sync";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

/**
 * Trigger sync manual (fase 1).
 * Body: SyncPayload JSON { tasks, staff, areas, categories }
 * Proteksi: header x-internal-key === ADMIN_API_KEY (jika di-set).
 */
export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const expected = process.env.ADMIN_API_KEY;
    if (expected && !expected.includes("your-gas")) {
      const provided = request.headers.get("x-internal-key");
      if (provided !== expected) {
        return fail("Akses ditolak", { code: "FORBIDDEN", status: 403 });
      }
    }

    const body = (await request.json()) as SyncPayload & { source?: string };
    if (!body || typeof body !== "object") {
      return fail("Body sync tidak valid", {
        code: "INVALID_SYNC_PAYLOAD",
        status: 400,
      });
    }

    const { source, ...payload } = body;
    const result = await runSyncPayload(
      payload,
      source ?? "api:internal/sync",
    );
    return ok(result);
  } catch (error) {
    console.error("[POST /api/internal/sync]", error);
    return fail(error instanceof Error ? error.message : "Sync gagal", {
      code: "SYNC_FAILED",
      status: 500,
    });
  }
}

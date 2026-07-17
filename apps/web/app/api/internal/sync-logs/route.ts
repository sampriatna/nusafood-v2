import { fail, ok } from "@/lib/api/response";
import { listSyncLogs } from "@/lib/services/sync.service";
import { requireAuth } from "@/lib/require-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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

    const limit = Number(new URL(request.url).searchParams.get("limit") ?? "50");
    const logs = await listSyncLogs(limit);
    return ok(logs, { total: logs.length, limit });
  } catch (error) {
    console.error("[GET /api/internal/sync-logs]", error);
    return fail("Gagal mengambil sync logs", {
      code: "SYNC_LOGS_FAILED",
      status: 500,
    });
  }
}

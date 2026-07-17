import { fail, ok } from "@/lib/api/response";
import { listSyncLogs } from "@/lib/services/sync.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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

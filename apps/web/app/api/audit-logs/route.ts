import { fail, ok } from "@/lib/api/response";
import { resolveListOutletFilter, OutletAccessError } from "@/lib/outlet-scope";
import {
  canViewAuditLog,
  hasGlobalOutletScope,
  isOwner,
} from "@/lib/permissions";
import { requireAuth } from "@/lib/require-auth";
import { listAuditLogs } from "@/lib/services/audit.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  if (!auth.session) {
    return fail("Unauthorized", { code: "UNAUTHORIZED", status: 401 });
  }

  // Global audit: Owner/Admin. Leader hanya outlet sendiri.
  if (!canViewAuditLog(auth.session)) {
    return fail("Akses ditolak.", { code: "FORBIDDEN", status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 100);
    const entityType = searchParams.get("entity_type") || undefined;
    const action = searchParams.get("action") || undefined;
    const actorId = searchParams.get("actor_id") || undefined;

    let outletCode: string | undefined;
    if (hasGlobalOutletScope(auth.session) || isOwner(auth.session)) {
      outletCode = searchParams.get("outlet") || undefined;
    } else {
      outletCode = resolveListOutletFilter(auth.session, null);
    }

    const data = await listAuditLogs({
      limit: Number.isFinite(limit) ? limit : 100,
      entityType,
      action,
      actorId,
      outletCode,
    });

    return ok(data, { total: data.length });
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[GET /api/audit-logs]", error);
    return fail("Gagal memuat audit log", {
      code: "AUDIT_LIST_FAILED",
      status: 500,
    });
  }
}

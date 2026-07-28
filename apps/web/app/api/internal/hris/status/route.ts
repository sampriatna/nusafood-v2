import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  getHrisIntegrationStatus,
  listHrisSyncLogs,
  listStaffNeedingManualReview,
} from "@/lib/services/hris-integration.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const [status, logs, manualReview] = await Promise.all([
      getHrisIntegrationStatus(),
      listHrisSyncLogs(10),
      listStaffNeedingManualReview(),
    ]);

    return ok({
      ...status,
      recent_logs: logs.map((log) => ({
        id: log.id,
        started_at: log.startedAt.toISOString(),
        completed_at: log.completedAt?.toISOString() ?? null,
        status: log.status,
        checked_count: log.checkedCount,
        created_count: log.createdCount,
        updated_count: log.updatedCount,
        deactivated_count: log.deactivatedCount,
        failed_count: log.failedCount,
        error_summary: log.errorSummary,
        triggered_by_name: log.triggeredByName,
      })),
      manual_review: manualReview.map((s) => ({
        staff_id: s.staffId,
        name: s.name,
        wa_number: s.waNumber,
        outlet: s.outlet.code,
        hris_link_status: s.hrisLinkStatus,
      })),
    });
  } catch (error) {
    console.error("[GET /api/internal/hris/status]", error);
    return fail("Gagal membaca status integrasi HRIS", {
      code: "HRIS_STATUS_FAILED",
      status: 500,
    });
  }
}

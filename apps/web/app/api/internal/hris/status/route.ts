import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  getHrisIntegrationStatus,
  listHrisSyncLogs,
  listStaffNeedingManualReview,
} from "@/lib/services/hris-integration.service";
import {
  getLastSuccessfulSyncTime,
  isOutletMappingConfirmed,
} from "@/lib/services/hris-staff-sync.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const [status, logs, manualReview, incrementalSince] = await Promise.all([
      getHrisIntegrationStatus(),
      listHrisSyncLogs(10),
      listStaffNeedingManualReview(),
      getLastSuccessfulSyncTime(),
    ]);

    return ok({
      ...status,
      outlet_mapping_confirmed: isOutletMappingConfirmed(),
      incremental_since: incrementalSince ?? null,
      cron_note:
        "Vercel cron memakai UTC. Jadwal saat ini 19:00 UTC = 02:00 WIB.",
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
        wa_needs_completion: s.waNeedsCompletion,
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

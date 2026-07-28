import type { HrisIntegrationStatus } from "@nusafood/types";
import { prisma } from "@/lib/db";
import { HrisApiClient } from "@/lib/services/hris-api.client";

export function isHrisSyncEnabled(): boolean {
  return process.env.HRIS_SYNC_ENABLED === "true";
}

export async function getHrisIntegrationStatus(): Promise<HrisIntegrationStatus> {
  const client = new HrisApiClient();
  const configured = client.isConfigured();
  const enabled = isHrisSyncEnabled();

  const [linked, unlinked, manualReview, lastLog] = await Promise.all([
    prisma.staff.count({ where: { hrisLinkStatus: "LINKED" } }),
    prisma.staff.count({
      where: { hrisLinkStatus: { in: ["UNLINKED", "AMBIGUOUS"] } },
    }),
    prisma.staff.count({ where: { hrisLinkStatus: "MANUAL_REVIEW" } }),
    prisma.hrisSyncLog.findFirst({
      orderBy: { startedAt: "desc" },
    }),
  ]);

  let connected = false;
  if (configured && enabled) {
    connected = await client.ping();
  }

  return {
    enabled,
    configured,
    connected,
    last_sync_at: lastLog?.completedAt?.toISOString() ?? null,
    last_sync_status: lastLog?.status ?? null,
    staff_linked_count: linked,
    staff_unlinked_count: unlinked,
    staff_manual_review_count: manualReview,
    last_error: lastLog?.errorSummary ?? null,
  };
}

export async function listHrisSyncLogs(limit = 20) {
  return prisma.hrisSyncLog.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
  });
}

export async function listStaffNeedingManualReview() {
  return prisma.staff.findMany({
    where: {
      hrisLinkStatus: { in: ["UNLINKED", "AMBIGUOUS", "MANUAL_REVIEW"] },
    },
    include: { outlet: true },
    orderBy: [{ name: "asc" }],
    take: 200,
  });
}

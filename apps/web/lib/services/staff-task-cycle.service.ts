import type { Task } from "@nusafood/types";
import { prisma } from "@/lib/db";
import { mapTaskToApi } from "@/lib/mappers/task";

const NON_ACTIONABLE_STATUSES = [
  "SUBMITTED",
  "RESUBMITTED",
  "WAITING_VERIFICATION",
  "DONE",
  "VERIFIED",
] as const;

/**
 * Tugas aktif yang harus terlihat dari link report statis staff.
 * Relasi staff_id diprioritaskan; fallback WA menjaga task lama/manual tetap terbaca.
 */
export async function listActionableTasksForStaff(
  staffId: string,
): Promise<Task[]> {
  const staff = await prisma.staff.findUnique({
    where: { staffId },
    select: { staffId: true, waNumber: true },
  });
  if (!staff) return [];

  const rows = await prisma.task.findMany({
    where: {
      OR: [
        { staffId: staff.staffId },
        ...(staff.waNumber
          ? [{ staffId: null, picWa: staff.waNumber }]
          : []),
      ],
      status: {
        notIn: [...NON_ACTIONABLE_STATUSES],
      },
    },
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
    take: 12,
  });

  return rows.map(mapTaskToApi);
}

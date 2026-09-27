import type { Prisma } from "@nusafood/database";
import { prisma } from "@/lib/db";
import {
  addDaysToDateKey,
  dateKeyInAppTz,
  monthKeyInAppTz,
} from "@/lib/format-datetime";
import { outletShortName } from "@/lib/outlet-codes";
import { buildOutletWhere } from "@/lib/outlet-scope";
import {
  aggregatePerformance,
  type GroupBy,
  type PerfBucket,
  type PerfTaskInput,
} from "@/lib/performance";
import { getPositionGroupLabel, resolveStaffPositionGroup } from "@/lib/position-groups";

export type PerformancePeriod = "7d" | "30d" | "month" | "last_month";

export const PERFORMANCE_PERIODS: { value: PerformancePeriod; label: string }[] = [
  { value: "7d", label: "7 hari" },
  { value: "30d", label: "30 hari" },
  { value: "month", label: "Bulan ini" },
  { value: "last_month", label: "Bulan lalu" },
];

export function isPerformancePeriod(value: unknown): value is PerformancePeriod {
  return PERFORMANCE_PERIODS.some((p) => p.value === value);
}

/** Rentang tanggal WIB (inklusif) untuk periode. */
export function periodRange(period: PerformancePeriod, now = new Date()): { start: string; end: string } {
  const today = dateKeyInAppTz(now);
  if (period === "7d") return { start: addDaysToDateKey(today, -6), end: today };
  if (period === "30d") return { start: addDaysToDateKey(today, -29), end: today };
  const month = monthKeyInAppTz(now);
  if (period === "month") return { start: `${month}-01`, end: today };
  const firstThis = `${month}-01`;
  const lastPrev = addDaysToDateKey(firstThis, -1);
  return { start: `${lastPrev.slice(0, 7)}-01`, end: lastPrev };
}

export type PerformanceData = {
  period: PerformancePeriod;
  range: { start: string; end: string };
  group_by: GroupBy;
  overall: PerfBucket;
  buckets: (PerfBucket & { letters?: number })[];
};

export async function getPerformance(options: {
  period: PerformancePeriod;
  groupBy: GroupBy;
  outlet?: string;
  now?: Date;
}): Promise<PerformanceData> {
  const now = options.now ?? new Date();
  const range = periodRange(options.period, now);
  const from = new Date(`${range.start}T00:00:00+07:00`);
  const to = new Date(`${addDaysToDateKey(range.end, 1)}T00:00:00+07:00`);

  const where: Prisma.TaskWhereInput = {
    AND: [
      { deadline: { gte: from, lt: to } },
      ...(options.outlet ? [buildOutletWhere(options.outlet)] : []),
    ],
  };

  const rows = await prisma.task.findMany({
    where,
    select: {
      taskId: true,
      taskTitle: true,
      status: true,
      deadline: true,
      submittedAt: true,
      verifiedAt: true,
      isLate: true,
      staffId: true,
      picName: true,
      outletName: true,
      outlet: { select: { code: true } },
      staff: { select: { position: true } },
    },
    take: 5000,
  });

  const tasks: PerfTaskInput[] = rows.map((row) => ({
    task_id: row.taskId,
    task_title: row.taskTitle,
    status: row.status,
    deadline: row.deadline,
    submitted_at: row.submittedAt,
    verified_at: row.verifiedAt,
    is_late: row.isLate,
    staff_id: row.staffId,
    pic_name: row.picName,
    outlet: row.outlet?.code || row.outletName || "",
    position_group: row.staff?.position
      ? resolveStaffPositionGroup(row.staff.position) || null
      : null,
  }));

  const { buckets, overall } = aggregatePerformance(tasks, options.groupBy, {
    now,
    divisionLabel: getPositionGroupLabel,
    outletLabel: outletShortName,
  });

  let withLetters: PerformanceData["buckets"] = buckets;
  if (options.groupBy === "person") {
    const staffIds = buckets.map((b) => b.key).filter((k) => !k.startsWith("name:"));
    if (staffIds.length) {
      const letters = await prisma.disciplinaryLetter.groupBy({
        by: ["employeeId"],
        where: {
          employeeId: { in: staffIds },
          status: { not: "CANCELLED" },
          incidentDate: { gte: new Date(`${range.start}T00:00:00Z`), lte: new Date(`${range.end}T00:00:00Z`) },
        },
        _count: { _all: true },
      });
      const counts = new Map(letters.map((l) => [l.employeeId, l._count._all]));
      withLetters = buckets.map((b) => ({ ...b, letters: counts.get(b.key) ?? 0 }));
    }
  }

  return { period: options.period, range, group_by: options.groupBy, overall, buckets: withLetters };
}

import type { Prisma } from "@nusafood/database";
import { prisma } from "@/lib/db";
import {
  addDaysToDateKey,
  dateKeyInAppTz,
  monthKeyInAppTz,
} from "@/lib/format-datetime";
import { outletShortName } from "@/lib/outlet-codes";
import { buildOutletWhere, buildStaffOutletWhere } from "@/lib/outlet-scope";
import {
  aggregatePerformance,
  computeSopCompliance,
  sopScore,
  worstScore,
  type GroupBy,
  type PerfBucket,
  type PerfTaskInput,
} from "@/lib/performance";
import { getPositionGroupLabel, resolveStaffPositionGroup } from "@/lib/position-groups";
import { matchesPositionGroup } from "@/lib/services/daily-activity.service";
import { loadStaffJobDataForRange } from "@/lib/services/staff-job-profile.service";

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

export type SopFields = {
  sop_required: number;
  sop_done: number;
  sop_score: number | null;
  /** Skor penentu label & urutan: terendah dari skor tugas dan SOP. */
  final_score: number | null;
  sop_missed: { date: string; title: string }[];
};

export type PerformanceBucket = PerfBucket & SopFields & { letters?: number };

export type PerformanceData = {
  period: PerformancePeriod;
  range: { start: string; end: string };
  /** Hari terakhir yang dihitung untuk SOP (hari ini belum selesai, jadi s.d. kemarin). */
  sop_until: string | null;
  group_by: GroupBy;
  overall: PerformanceBucket;
  buckets: PerformanceBucket[];
};

function datesBetween(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDaysToDateKey(d, 1)) out.push(d);
  return out;
}

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

  const letterCounts = new Map<string, number>();
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
      for (const l of letters) letterCounts.set(l.employeeId, l._count._all);
    }
  }

  // ── SOP harian: s.d. kemarin (hari ini belum selesai) ──
  const yesterday = addDaysToDateKey(dateKeyInAppTz(now), -1);
  const sopUntil = range.end < yesterday ? range.end : yesterday;
  const sopDates = sopUntil >= range.start ? datesBetween(range.start, sopUntil) : [];

  const merged = new Map<string, PerformanceBucket>();
  const blankSop = (): SopFields => ({ sop_required: 0, sop_done: 0, sop_score: null, final_score: null, sop_missed: [] });
  for (const b of buckets) {
    merged.set(b.key, { ...b, ...blankSop(), letters: letterCounts.get(b.key) });
  }
  const overallMerged: PerformanceBucket = { ...overall, ...blankSop() };

  if (sopDates.length) {
    const [staffRows, templates, submissions, jobData] = await Promise.all([
      prisma.staff.findMany({
        where: { status: "ACTIVE", ...(options.outlet ? buildStaffOutletWhere(options.outlet) : {}) },
        select: { staffId: true, name: true, position: true, outletId: true, outlet: { select: { code: true } } },
      }),
      prisma.reportTemplate.findMany({
        where: { active: true, isRequiredDaily: true },
        select: { id: true, title: true, outletId: true, positionGroup: true },
      }),
      prisma.dailyReportSubmission.findMany({
        where: {
          reportDate: { gte: new Date(`${range.start}T00:00:00Z`), lte: new Date(`${sopUntil}T00:00:00Z`) },
          // NULL = belum divalidasi → tetap dihitung (NOT IN akan membuang NULL).
          OR: [{ leaderValidation: null }, { leaderValidation: { notIn: ["tidak_valid", "manipulasi"] } }],
        },
        select: { staffId: true, reportTemplateId: true, reportDate: true },
      }),
      loadStaffJobDataForRange(range.start, sopUntil),
    ]);

    const staffInput = staffRows.map((st) => {
      const pos = st.position ?? "";
      return {
        staff_id: st.staffId,
        name: st.name,
        outlet: st.outlet?.code ?? "",
        outlet_id: st.outletId,
        primary: resolveStaffPositionGroup(pos) || pos.trim(),
        secondary: jobData.secondary.get(st.staffId) ?? [],
      };
    });
    const sop = computeSopCompliance({
      staff: staffInput,
      templates: templates.map((t) => ({ id: t.id, outlet_id: t.outletId, position_group: t.positionGroup })),
      dates: sopDates,
      duties: jobData.duties,
      submissions: new Set(
        submissions.map((x) => `${x.staffId}|${x.reportTemplateId}|${x.reportDate.toISOString().slice(0, 10)}`),
      ),
      matchesPosition: matchesPositionGroup,
    });
    const titles = new Map(templates.map((t) => [t.id, t.title]));

    for (const st of staffInput) {
      const r = sop.get(st.staff_id);
      if (!r || !r.required) continue;
      const division = resolveStaffPositionGroup(st.primary) || null;
      let key: string;
      let label: string;
      let sublabel: string | undefined;
      if (options.groupBy === "person") {
        key = st.staff_id;
        label = st.name;
        sublabel = [division ? getPositionGroupLabel(division) : null, outletShortName(st.outlet)].filter(Boolean).join(" · ");
      } else if (options.groupBy === "division") {
        key = division || "lainnya";
        label = division ? getPositionGroupLabel(division) : "Tanpa divisi";
      } else {
        key = st.outlet || "lainnya";
        label = st.outlet ? outletShortName(st.outlet) : "Tanpa outlet";
      }
      const bucket =
        merged.get(key) ??
        ({
          key,
          label,
          sublabel,
          total: 0,
          on_time: 0,
          late_done: 0,
          overdue: 0,
          in_progress: 0,
          revision: 0,
          verified: 0,
          score: null,
          late_tasks: [],
          ...blankSop(),
          letters: letterCounts.get(key),
        } satisfies PerformanceBucket);
      merged.set(key, bucket);
      bucket.sop_required += r.required;
      bucket.sop_done += r.done;
      overallMerged.sop_required += r.required;
      overallMerged.sop_done += r.done;
      if (options.groupBy === "person") {
        bucket.sop_missed = r.missed
          .slice(-10)
          .reverse()
          .map((m) => ({ date: m.date, title: titles.get(m.template_id) ?? "Laporan SOP" }));
      }
    }
  }

  const finalBuckets = [...merged.values()];
  for (const b of [...finalBuckets, overallMerged]) {
    b.sop_score = sopScore(b.sop_required, b.sop_done);
    b.final_score = worstScore(b.score, b.sop_score);
  }
  finalBuckets.sort((a, c) => {
    if (a.final_score === null && c.final_score === null) return c.total - a.total;
    if (a.final_score === null) return 1;
    if (c.final_score === null) return -1;
    return a.final_score - c.final_score || c.total - a.total;
  });

  return {
    period: options.period,
    range,
    sop_until: sopDates.length ? sopUntil : null,
    group_by: options.groupBy,
    overall: overallMerged,
    buckets: finalBuckets,
  };
}

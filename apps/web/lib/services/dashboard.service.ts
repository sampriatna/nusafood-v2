import type { FullDashboardSummary } from "@nusafood/types";
import { prisma } from "@/lib/db";

const OPEN_TASK = [
  "CREATED",
  "SENT",
  "OPEN",
  "OPENED",
  "WA_FAILED",
] as const;
const SUBMITTED_TASK = ["SUBMITTED", "RESUBMITTED", "WAITING_VERIFICATION"] as const;
const DONE_TASK = ["DONE", "VERIFIED"] as const;
const REVISI_TASK = ["REVISI", "REVISION", "REVISION_REQUESTED"] as const;

export async function getDashboardSummary(filters?: {
  outlet?: string;
  date_from?: string;
  date_to?: string;
}): Promise<FullDashboardSummary> {
  const deadlineFilter =
    filters?.date_from || filters?.date_to
      ? {
          deadline: {
            ...(filters.date_from
              ? { gte: new Date(filters.date_from) }
              : {}),
            ...(filters.date_to
              ? {
                  lte: (() => {
                    const end = new Date(filters.date_to);
                    end.setHours(23, 59, 59, 999);
                    return end;
                  })(),
                }
              : {}),
          },
        }
      : {};

  const outletFilter = filters?.outlet
    ? {
        OR: [
          {
            outletName: { equals: filters.outlet, mode: "insensitive" as const },
          },
          {
            outlet: {
              code: { equals: filters.outlet, mode: "insensitive" as const },
            },
          },
          {
            outlet: {
              name: { equals: filters.outlet, mode: "insensitive" as const },
            },
          },
        ],
      }
    : {};

  const taskWhere = {
    ...deadlineFilter,
    ...outletFilter,
  };

  const checklistWhere = {
    ...deadlineFilter,
    ...(filters?.outlet
      ? {
          OR: [
            {
              outlet: {
                code: { equals: filters.outlet, mode: "insensitive" as const },
              },
            },
            {
              outlet: {
                name: { equals: filters.outlet, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };

  const [
    taskTotal,
    taskOpen,
    taskSubmitted,
    taskDone,
    taskLate,
    taskRevisi,
    checklistTotal,
    checklistOpen,
    checklistSubmitted,
    checklistDone,
    checklistLate,
    checklistRevisi,
  ] = await Promise.all([
    prisma.task.count({ where: taskWhere }),
    prisma.task.count({ where: { ...taskWhere, status: { in: [...OPEN_TASK] } } }),
    prisma.task.count({
      where: { ...taskWhere, status: { in: [...SUBMITTED_TASK] } },
    }),
    prisma.task.count({ where: { ...taskWhere, status: { in: [...DONE_TASK] } } }),
    prisma.task.count({
      where: {
        ...taskWhere,
        OR: [{ isLate: true }, { status: "LATE" }],
      },
    }),
    prisma.task.count({
      where: { ...taskWhere, status: { in: [...REVISI_TASK] } },
    }),
    prisma.checklistReport.count({ where: checklistWhere }),
    prisma.checklistReport.count({
      where: { ...checklistWhere, status: "OPEN" },
    }),
    prisma.checklistReport.count({
      where: { ...checklistWhere, status: "SUBMITTED" },
    }),
    prisma.checklistReport.count({
      where: { ...checklistWhere, status: "DONE" },
    }),
    prisma.checklistReport.count({
      where: {
        ...checklistWhere,
        OR: [{ isLate: true }, { status: "LATE" }],
      },
    }),
    prisma.checklistReport.count({
      where: { ...checklistWhere, status: "REVISI" },
    }),
  ]);

  return {
    tasks: {
      total: taskTotal,
      open: taskOpen,
      submitted: taskSubmitted,
      done: taskDone,
      late: taskLate,
      revisi: taskRevisi,
    },
    checklists: {
      total: checklistTotal,
      open: checklistOpen,
      submitted: checklistSubmitted,
      done: checklistDone,
      late: checklistLate,
      revisi: checklistRevisi,
    },
  };
}

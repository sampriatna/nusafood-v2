import type { Prisma, TaskStatus } from "@nusafood/database";
import type { Task, TaskFilters } from "@nusafood/types";
import { asString, normalizeStatus } from "@nusafood/database/normalizers";
import { prisma } from "@/lib/db";
import { mapTaskToApi } from "@/lib/mappers/task";
import {
  callGasAction,
  isGasEnabled,
} from "@/lib/services/gas-adapter.service";


const OPEN_STATUSES: TaskStatus[] = [
  "CREATED",
  "SENT",
  "OPEN",
  "OPENED",
  "WA_FAILED",
];

export async function listTasks(filters: TaskFilters = {}) {
  const page = filters.page && filters.page > 0 ? Math.floor(filters.page) : 1;
  const limit = Math.min(
    Math.max(
      filters.limit && filters.limit > 0 ? Math.floor(filters.limit) : 50,
      1,
    ),
    200,
  );
  const skip = (page - 1) * limit;

  const and: Prisma.TaskWhereInput[] = [];

  if (filters.outlet) {
    const outlet = filters.outlet;
    and.push({
      OR: [
        { outletName: { equals: outlet, mode: "insensitive" } },
        { outlet: { code: { equals: outlet, mode: "insensitive" } } },
        { outlet: { name: { equals: outlet, mode: "insensitive" } } },
      ],
    });
  }

  if (filters.status) {
    const status = String(filters.status).toUpperCase();
    if (status === "OPEN") {
      and.push({ status: { in: OPEN_STATUSES } });
    } else if (status === "REVISI") {
      and.push({
        status: { in: ["REVISI", "REVISION", "REVISION_REQUESTED"] },
      });
    } else {
      and.push({ status: status as TaskStatus });
    }
  }

  if (filters.pic) {
    and.push({
      OR: [
        { picWa: { contains: filters.pic } },
        { picName: { contains: filters.pic, mode: "insensitive" } },
      ],
    });
  }

  if (filters.checklist_mode !== undefined) {
    and.push({ checklistMode: filters.checklist_mode });
  }

  if (filters.date_from || filters.date_to) {
    and.push({
      deadline: {
        ...(filters.date_from ? { gte: new Date(filters.date_from) } : {}),
        ...(filters.date_to
          ? {
              lte: (() => {
                const end = new Date(filters.date_to!);
                end.setHours(23, 59, 59, 999);
                return end;
              })(),
            }
          : {}),
      },
    });
  }

  const where: Prisma.TaskWhereInput = and.length > 0 ? { AND: and } : {};

  const [total, rows] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      orderBy: [{ deadline: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    }),
  ]);

  return {
    data: rows.map(mapTaskToApi),
    meta: { page, limit, total },
  };
}

export async function getTaskById(taskId: string): Promise<Task | null> {
  const task = await prisma.task.findUnique({ where: { taskId } });
  return task ? mapTaskToApi(task) : null;
}

/**
 * Adapter baca tugas by token:
 * 1) PostgreSQL v2
 * 2) Fallback GAS v1 (tugas historis) jika enabled
 */
export async function getTaskByToken(
  taskId: string,
  token: string,
): Promise<Task | null> {
  const task = await prisma.task.findFirst({
    where: { taskId, token },
  });
  if (task) return mapTaskToApi(task);

  if (!isGasEnabled()) return null;

  const gas = await callGasAction<Record<string, unknown>>(
    "getTaskByToken",
    { task_id: taskId, token },
    "GET",
  );

  if (!gas.success || !gas.data) return null;

  const data = gas.data;
  const mapped: Task = {
    task_id: asString(data.task_id) || taskId,
    token: asString(data.token) || token,
    created_at: asString(data.created_at) || new Date().toISOString(),
    created_by: asString(data.created_by),
    outlet: asString(data.outlet),
    area: asString(data.area),
    category: asString(data.category),
    task_title: asString(data.task_title),
    task_description: asString(data.task_description),
    priority: (asString(data.priority) || "Medium") as Task["priority"],
    pic_name: asString(data.pic_name),
    pic_wa: asString(data.pic_wa),
    deadline: asString(data.deadline) || new Date().toISOString(),
    before_photo_url: asString(data.before_photo_url) || undefined,
    status: normalizeStatus(data.status) as Task["status"],
    report_link: asString(data.report_link),
    after_photo_url: asString(data.after_photo_url) || undefined,
    staff_note: asString(data.staff_note) || undefined,
    is_late: Boolean(data.is_late === true || data.is_late === "YES"),
    last_updated:
      asString(data.last_updated || data.updated_at) ||
      new Date().toISOString(),
    checklist_mode:
      data.checklist_mode === true || data.checklist_mode === "YES",
    source_version: "v1",
  };

  return mapped;
}


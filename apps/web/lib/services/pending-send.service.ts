import type { Prisma } from "@nusafood/database";
import type { Task } from "@nusafood/types";
import { prisma } from "@/lib/db";
import { mapTaskToApi } from "@/lib/mappers/task";
import { buildOutletWhere } from "@/lib/outlet-scope";
import { logSyncOperation } from "@/lib/services/dual-write.service";
import {
  buildChecklistWaMessage,
  buildTaskWaMessage,
  buildWaMeLink,
  buildWaShareLink,
} from "@/lib/wa-message";

/** Status tugas yang belum dikerjakan dan belum pernah dikirim ke PIC. */
const UNSENT_STATUSES = ["OPEN", "CREATED", "WA_FAILED"] as const;
const LOOKBACK_DAYS = 3;

export type PendingSendTask = Task & {
  wa_link: string;
  wa_share_link: string;
};

export function buildTaskMessage(task: Task): string {
  const outlet = typeof task.outlet === "string" ? task.outlet : undefined;
  return task.checklist_mode
    ? buildChecklistWaMessage({
        pic_name: task.pic_name,
        report_link: task.report_link,
        template_title: task.task_title,
        deadline: task.deadline,
        outlet,
      })
    : buildTaskWaMessage({
        task_title: task.task_title,
        pic_name: task.pic_name,
        deadline: task.deadline,
        report_link: task.report_link,
        outlet,
      });
}

/** Tugas v2 beberapa hari terakhir yang belum dikirim WA-nya (tanpa GAS/Fonnte). */
export async function listPendingSend(
  outlet?: string,
  now = new Date(),
): Promise<PendingSendTask[]> {
  const since = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const where: Prisma.TaskWhereInput = {
    AND: [
      { waSentAt: null },
      { status: { in: [...UNSENT_STATUSES] } },
      { sourceVersion: "v2" },
      { createdAt: { gte: since } },
      ...(outlet ? [buildOutletWhere(outlet)] : []),
    ],
  };

  const rows = await prisma.task.findMany({
    where,
    orderBy: { deadline: "asc" },
    take: 50,
  });

  return rows.map((row) => {
    const task = mapTaskToApi(row);
    const message = buildTaskMessage(task);
    return {
      ...task,
      wa_link: buildWaMeLink(task.pic_wa, message),
      wa_share_link: buildWaShareLink(message),
    };
  });
}

/** Tandai tugas sudah dikirim manual lewat wa.me. */
export async function markTaskSent(taskId: string): Promise<Task | null> {
  const task = await prisma.task.findUnique({ where: { taskId } });
  if (!task) return null;

  const updated = await prisma.task.update({
    where: { taskId },
    data: {
      waSentAt: task.waSentAt ?? new Date(),
      ...((UNSENT_STATUSES as readonly string[]).includes(task.status)
        ? { status: "SENT" }
        : {}),
    },
  });

  await logSyncOperation({
    operation: "mark_wa_sent_manual",
    entityType: "task",
    entityId: taskId,
    taskId,
    outletId: task.outletId,
    picWa: task.picWa,
    v2Status: "success",
    v2Response: { method: "wame_manual" },
  });

  return mapTaskToApi(updated);
}

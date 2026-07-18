import type { RepeatType } from "@nusafood/database";
import { prisma } from "@/lib/db";
import { dateKeyInAppTz, todayKeyInAppTz } from "@/lib/format-datetime";
import { generateChecklistReport } from "@/lib/services/checklist.service";
import { logSyncOperation } from "@/lib/services/dual-write.service";
import { createTask } from "@/lib/services/task-write.service";

const WIB_TO_ID: Record<string, string> = {
  Mon: "senin",
  Tue: "selasa",
  Wed: "rabu",
  Thu: "kamis",
  Fri: "jumat",
  Sat: "sabtu",
  Sun: "minggu",
};

function wibParts(date: Date) {
  const weekdayEn = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
  }).format(date);
  const weekdayId = WIB_TO_ID[weekdayEn] ?? weekdayEn.toLowerCase();
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jakarta",
      hour: "numeric",
      hour12: false,
    }).format(date),
  );
  const minute = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jakarta",
      minute: "numeric",
    }).format(date),
  );
  const dayOfMonth = Number(dateKeyInAppTz(date).split("-")[2]);
  return { weekdayEn, weekdayId, hour, minute, dayOfMonth };
}

function repeatTimeParts(repeatTime: Date) {
  return {
    hour: repeatTime.getUTCHours(),
    minute: repeatTime.getUTCMinutes(),
  };
}

export function matchesRepeatSchedule(
  repeatType: RepeatType,
  repeatDays: string[],
  repeatTime: Date,
  now: Date,
  options?: { ignoreTime?: boolean },
): boolean {
  const { weekdayId, hour, minute } = wibParts(now);
  const scheduled = repeatTimeParts(repeatTime);
  const normalizedDays = repeatDays.map((d) => d.toLowerCase());

  if (!options?.ignoreTime) {
    if (
      hour < scheduled.hour ||
      (hour === scheduled.hour && minute < scheduled.minute)
    ) {
      return false;
    }
  }

  switch (repeatType) {
    case "daily":
      return true;
    case "weekdays":
      return !["sabtu", "minggu"].includes(weekdayId);
    case "weekly":
    case "custom":
      return normalizedDays.includes(weekdayId);
    case "monthly":
      return false;
    default:
      return false;
  }
}

/** Monthly: jalankan pada tanggal yang sama dengan hari repeat_time day-of-month stored in UTC hours hack — use created day */
function matchesMonthly(templateCreatedAt: Date, now: Date): boolean {
  const createdDom = Number(dateKeyInAppTz(templateCreatedAt).split("-")[2]);
  const { dayOfMonth } = wibParts(now);
  return createdDom === dayOfMonth;
}

export async function hasRecurringGenerationForDate(
  recurringTemplateId: string,
  outletId: string,
  dateKey: string,
): Promise<boolean> {
  const start = new Date(`${dateKey}T00:00:00+07:00`);
  const end = new Date(`${dateKey}T23:59:59.999+07:00`);
  const count = await prisma.task.count({
    where: {
      recurringTemplateId,
      outletId,
      createdAt: { gte: start, lte: end },
    },
  });
  return count > 0;
}

function buildDeadline(dateKey: string, deadlineTime: Date): Date {
  const h = String(deadlineTime.getUTCHours()).padStart(2, "0");
  const min = String(deadlineTime.getUTCMinutes()).padStart(2, "0");
  return new Date(`${dateKey}T${h}:${min}:00+07:00`);
}

export type RecurringGenerateResult = {
  template_id: string;
  status: "created" | "skipped" | "failed";
  reason?: string;
  task_id?: string;
  error?: string;
};

export async function generateRecurringTasks(input?: {
  scheduled_date?: string;
  template_id?: string;
  force?: boolean;
  send_whatsapp?: boolean;
}): Promise<{ date: string; results: RecurringGenerateResult[] }> {
  const dateKey = input?.scheduled_date ?? todayKeyInAppTz();
  const now = input?.scheduled_date
    ? new Date(`${dateKey}T12:00:00+07:00`)
    : new Date();

  const templates = await prisma.recurringTemplate.findMany({
    where: {
      activeStatus: true,
      ...(input?.template_id ? { templateId: input.template_id } : {}),
    },
    include: { outlet: true, area: true, category: true },
  });

  const results: RecurringGenerateResult[] = [];

  for (const tpl of templates) {
    const scheduled =
      input?.force ||
      (tpl.repeatType === "monthly"
        ? matchesMonthly(tpl.createdAt, now) &&
          wibParts(now).hour >= repeatTimeParts(tpl.repeatTime).hour &&
          wibParts(now).minute >= repeatTimeParts(tpl.repeatTime).minute
        : matchesRepeatSchedule(
            tpl.repeatType,
            tpl.repeatDays,
            tpl.repeatTime,
            now,
            { ignoreTime: Boolean(input?.force) },
          ));

    if (!scheduled) {
      results.push({
        template_id: tpl.templateId,
        status: "skipped",
        reason: "not_scheduled_today",
      });
      continue;
    }

    if (await hasRecurringGenerationForDate(tpl.templateId, tpl.outletId, dateKey)) {
      results.push({
        template_id: tpl.templateId,
        status: "skipped",
        reason: "duplicate",
      });
      continue;
    }

    try {
      const deadline = buildDeadline(dateKey, tpl.deadlineTime);
      const checklist = await prisma.checklistTemplate.findUnique({
        where: { templateId: tpl.templateId },
        include: {
          items: { where: { activeStatus: true }, take: 1 },
        },
      });

      if (checklist && checklist.items.length > 0) {
        const gen = await generateChecklistReport({
          template_id: tpl.templateId,
          pic_name: tpl.picName,
          pic_wa: tpl.picWa,
          deadline: deadline.toISOString(),
          recurring_template_id: tpl.templateId,
          send_whatsapp: input?.send_whatsapp !== false,
        });
        results.push({
          template_id: tpl.templateId,
          status: "created",
          task_id: gen.task.task_id,
        });
      } else {
        const task = await createTask({
          outlet: tpl.outlet.code,
          area: tpl.area?.name ?? "",
          category: tpl.category?.name ?? "",
          task_title: tpl.taskTitle,
          task_description: tpl.taskDescription ?? "",
          pic_name: tpl.picName,
          pic_wa: tpl.picWa,
          deadline: deadline.toISOString(),
          priority: "Medium",
        });
        await prisma.task.updateMany({
          where: { taskId: task.task_id },
          data: { recurringTemplateId: tpl.templateId },
        });
        results.push({
          template_id: tpl.templateId,
          status: "created",
          task_id: task.task_id,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Generate recurring gagal";
      results.push({
        template_id: tpl.templateId,
        status: "failed",
        error: message,
      });
      await logSyncOperation({
        operation: "generate_recurring",
        entityType: "recurring_template",
        entityId: tpl.templateId,
        outletId: tpl.outletId,
        v2Status: "failed",
        errorMessage: message,
      });
    }
  }

  await logSyncOperation({
    operation: "generate_recurring_batch",
    entityType: "recurring_template",
    v2Status: "success",
    v2Response: { date: dateKey, results },
    metadata: { total: results.length },
  });

  return { date: dateKey, results };
}

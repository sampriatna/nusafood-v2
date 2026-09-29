import type { RepeatType } from "@nusafood/database";
import { prisma } from "@/lib/db";
import { dateKeyInAppTz, todayKeyInAppTz } from "@/lib/format-datetime";
import { generateChecklistReport } from "@/lib/services/checklist.service";
import { logSyncOperation } from "@/lib/services/dual-write.service";
import { createTask } from "@/lib/services/task-write.service";
import { sendWebPushToStaff } from "@/lib/services/web-push.service";
import {
  getPicPositions,
  resolvePicCandidates,
} from "@/lib/services/recurring-pic.service";

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

/** Tanggal bulanan dari repeat_days (mis. ["1","15"]); abaikan nilai non-angka. */
export function parseMonthlyDates(repeatDays: string[]): number[] {
  return [
    ...new Set(
      repeatDays
        .map((d) => Number(String(d).trim()))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 31),
    ),
  ].sort((a, b) => a - b);
}

/**
 * Bulanan: jalan di tanggal yang dipilih (bisa lebih dari satu).
 * Tanggal 29–31 di bulan yang lebih pendek jatuh ke hari terakhir bulan itu.
 * Template lama tanpa tanggal → pakai tanggal template dibuat.
 */
export function matchesMonthly(
  repeatDays: string[],
  templateCreatedAt: Date,
  now: Date,
): boolean {
  const [year, month, day] = dateKeyInAppTz(now).split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let dates = parseMonthlyDates(repeatDays);
  if (!dates.length) {
    dates = [Number(dateKeyInAppTz(templateCreatedAt).split("-")[2])];
  }
  return dates.some((d) => Math.min(d, lastDay) === day);
}

/** Apakah template dijadwalkan pada tanggal `now` (WIB), tanpa melihat jam. */
export function isScheduledOnDate(
  tpl: { repeatType: RepeatType; repeatDays: string[]; repeatTime: Date; createdAt: Date },
  now: Date,
): boolean {
  if (tpl.repeatType === "monthly") {
    return matchesMonthly(tpl.repeatDays, tpl.createdAt, now);
  }
  return matchesRepeatSchedule(tpl.repeatType, tpl.repeatDays, tpl.repeatTime, now, {
    ignoreTime: true,
  });
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
  const picPositions = await getPicPositions(templates.map((t) => t.templateId));

  for (const tpl of templates) {
    // Semua tugas yang jadwalnya hari ini dibuat sekaligus (cron pagi / saat admin
    // buka dashboard); jam template dipakai untuk deadline, bukan syarat generate.
    const scheduled = input?.force || isScheduledOnDate(tpl, now);

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

      // PIC berdasarkan posisi → siapa yang bertugas hari itu; template PIC jadi cadangan.
      let pic = { name: tpl.picName, wa: tpl.picWa, staffId: tpl.staffId ?? undefined };
      const position = picPositions.get(tpl.templateId);
      if (position) {
        const [first] = await resolvePicCandidates(tpl.outletId, position, dateKey);
        if (first) pic = { name: first.name, wa: first.wa_number, staffId: first.staff_id };
      }

      const checklist = await prisma.checklistTemplate.findUnique({
        where: { templateId: tpl.templateId },
        include: {
          items: { where: { activeStatus: true }, take: 1 },
        },
      });

      if (checklist && checklist.items.length > 0) {
        const gen = await generateChecklistReport({
          template_id: tpl.templateId,
          pic_name: pic.name,
          pic_wa: pic.wa,
          deadline: deadline.toISOString(),
          recurring_template_id: tpl.templateId,
          // Push/link personal adalah jalur utama. WA hanya jika diminta eksplisit.
          send_whatsapp: input?.send_whatsapp === true,
        });

        // Checklist lama hanya menyimpan nama/WA PIC. Hubungkan juga ke staff_id
        // supaya otomatis muncul di link personal /r/[token].
        await prisma.task.updateMany({
          where: { taskId: gen.task.task_id },
          data: {
            recurringTemplateId: tpl.templateId,
            ...(pic.staffId ? { staffId: pic.staffId } : {}),
            ...(tpl.taskDescription
              ? { taskDescription: tpl.taskDescription }
              : {}),
          },
        });

        await sendWebPushToStaff(pic.staffId);

        results.push({
          template_id: tpl.templateId,
          status: "created",
          task_id: gen.task.task_id,
        });
      } else {
        const { task } = await createTask({
          outlet: tpl.outlet.code,
          area: tpl.area?.name ?? "",
          category: tpl.category?.name ?? "",
          task_title: tpl.taskTitle,
          task_description: tpl.taskDescription ?? "",
          pic_name: pic.name,
          pic_wa: pic.wa,
          ...(pic.staffId ? { staff_id: pic.staffId } : {}),
          deadline: deadline.toISOString(),
          priority: "Medium",
        });
        await prisma.task.updateMany({
          where: { taskId: task.task_id },
          data: { recurringTemplateId: tpl.templateId },
        });
        await sendWebPushToStaff(pic.staffId);
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

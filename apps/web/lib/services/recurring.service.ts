import type { RepeatType } from "@nusafood/database";
import type { DayOfWeek, RecurringTemplate } from "@nusafood/types";
import { normalizeOutletCode } from "@nusafood/database/normalizers";
import { prisma } from "@/lib/db";
import { generateRecurringTemplateId } from "@/lib/id";
import { ChecklistError } from "@/lib/services/checklist.service";

function parseTime(value: string): Date {
  // Store as UTC time-of-day on epoch date
  const [h = "0", m = "0"] = value.split(":");
  const d = new Date(Date.UTC(1970, 0, 1, Number(h), Number(m), 0));
  return d;
}

function formatTime(value: Date): string {
  const h = String(value.getUTCHours()).padStart(2, "0");
  const m = String(value.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function mapRecurring(row: {
  templateId: string;
  templateName: string;
  picName: string;
  picWa: string;
  staffId: string | null;
  taskTitle: string;
  taskDescription: string | null;
  repeatType: RepeatType;
  repeatDays: string[];
  repeatTime: Date;
  deadlineTime: Date;
  requiresPhoto: boolean;
  activeStatus: boolean;
  templateVersion: number;
  createdAt: Date;
  updatedAt: Date;
  outlet: { code: string; name: string };
  area: { name: string } | null;
  category: { name: string } | null;
}): RecurringTemplate {
  return {
    template_id: row.templateId,
    template_name: row.templateName,
    outlet: row.outlet.code,
    area: row.area?.name ?? "",
    category: row.category?.name ?? "",
    pic_name: row.picName,
    pic_wa: row.picWa,
    staff_id: row.staffId ?? undefined,
    task_title: row.taskTitle,
    task_description: row.taskDescription ?? "",
    repeat_type: row.repeatType,
    repeat_days: row.repeatDays as DayOfWeek[],
    repeat_time: formatTime(row.repeatTime),
    deadline_time: formatTime(row.deadlineTime),
    requires_photo: row.requiresPhoto,
    active_status: row.activeStatus,
    template_version: row.templateVersion,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

const include = {
  outlet: true,
  area: true,
  category: true,
} as const;

export async function listRecurringTemplates() {
  const rows = await prisma.recurringTemplate.findMany({
    include,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(mapRecurring);
}

export async function getRecurringTemplate(templateId: string) {
  const row = await prisma.recurringTemplate.findUnique({
    where: { templateId },
    include,
  });
  return row ? mapRecurring(row) : null;
}

export async function createRecurringTemplate(input: {
  template_name: string;
  outlet: string;
  area?: string;
  category?: string;
  pic_name: string;
  pic_wa: string;
  task_title: string;
  task_description?: string;
  repeat_type?: RepeatType;
  repeat_days?: string[];
  repeat_time: string;
  deadline_time: string;
  requires_photo?: boolean;
}) {
  const outletCode = normalizeOutletCode(input.outlet);
  const outlet = await prisma.outlet.findUnique({ where: { code: outletCode } });
  if (!outlet) {
    throw new ChecklistError("Outlet tidak ditemukan", "OUTLET_NOT_FOUND", 422);
  }

  let areaId: string | null = null;
  if (input.area) {
    const area = await prisma.area.upsert({
      where: { outletId_name: { outletId: outlet.id, name: input.area } },
      create: { outletId: outlet.id, name: input.area },
      update: {},
    });
    areaId = area.id;
  }

  let categoryId: string | null = null;
  if (input.category) {
    const category = await prisma.category.upsert({
      where: { name: input.category },
      create: { name: input.category },
      update: {},
    });
    categoryId = category.id;
  }

  const row = await prisma.recurringTemplate.create({
    data: {
      templateId: generateRecurringTemplateId(),
      templateName: input.template_name.trim(),
      outletId: outlet.id,
      areaId,
      categoryId,
      picName: input.pic_name.trim(),
      picWa: input.pic_wa.trim(),
      taskTitle: input.task_title.trim(),
      taskDescription: input.task_description?.trim() || null,
      repeatType: (input.repeat_type ?? "daily") as RepeatType,
      repeatDays: input.repeat_days ?? [],
      repeatTime: parseTime(input.repeat_time || "08:00"),
      deadlineTime: parseTime(input.deadline_time || "17:00"),
      requiresPhoto: input.requires_photo !== false,
    },
    include,
  });

  return mapRecurring(row);
}

export async function toggleRecurringTemplate(templateId: string) {
  const row = await prisma.recurringTemplate.findUnique({
    where: { templateId },
  });
  if (!row) {
    throw new ChecklistError("Template tidak ditemukan", "NOT_FOUND", 404);
  }
  const updated = await prisma.recurringTemplate.update({
    where: { templateId },
    data: { activeStatus: !row.activeStatus },
    include,
  });
  return mapRecurring(updated);
}

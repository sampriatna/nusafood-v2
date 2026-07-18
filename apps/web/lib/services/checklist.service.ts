import type { ChecklistReportStatus } from "@nusafood/database";
import type {
  ChecklistItem,
  ChecklistReport,
  ChecklistReportItem,
  ChecklistTemplate,
} from "@nusafood/types";
import { normalizeOutletCode } from "@nusafood/database/normalizers";
import { prisma } from "@/lib/db";
import {
  buildChecklistLink,
  generateChecklistItemId,
  generateChecklistReportId,
  generateChecklistTemplateId,
  generateReportItemId,
  generateTaskId,
  generateToken,
} from "@/lib/id";
import {
  mapChecklistReport,
  mapChecklistTemplate,
} from "@/lib/mappers/checklist";
import {
  callGasAction,
  isGasEnabled,
} from "@/lib/services/gas-adapter.service";
import {
  dualWriteEnabled,
  logSyncOperation,
  writeAuditLog,
} from "@/lib/services/dual-write.service";
import { TaskWriteError } from "@/lib/services/task-write.service";

export class ChecklistError extends TaskWriteError {}

async function resolveOutlet(outlet: string) {
  const code = normalizeOutletCode(outlet);
  const row = await prisma.outlet.findUnique({ where: { code } });
  if (!row) {
    throw new ChecklistError(
      `Outlet tidak ditemukan: ${outlet}`,
      "OUTLET_NOT_FOUND",
      422,
    );
  }
  return row;
}

async function resolveArea(outletId: string, areaName?: string | null) {
  if (!areaName) return null;
  return prisma.area.upsert({
    where: { outletId_name: { outletId, name: areaName } },
    create: { outletId, name: areaName },
    update: { isActive: true },
  });
}

export async function listChecklistTemplates(outlet?: string) {
  const rows = await prisma.checklistTemplate.findMany({
    where: {
      activeStatus: true,
      ...(outlet
        ? {
            outlet: {
              OR: [
                { code: { equals: outlet, mode: "insensitive" } },
                { name: { equals: outlet, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    include: {
      outlet: true,
      area: true,
      items: { orderBy: { itemOrder: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(mapChecklistTemplate);
}

export async function getChecklistTemplate(templateId: string) {
  const row = await prisma.checklistTemplate.findUnique({
    where: { templateId },
    include: {
      outlet: true,
      area: true,
      items: { orderBy: { itemOrder: "asc" } },
    },
  });
  return row ? mapChecklistTemplate(row) : null;
}

export async function createChecklistTemplate(input: {
  template_name: string;
  outlet: string;
  area?: string;
  checklist_title?: string;
  task_title?: string;
  pic_name?: string;
  pic_wa?: string;
  requires_photo?: boolean;
}) {
  if (!input.template_name?.trim()) {
    throw new ChecklistError("Nama template wajib", "VALIDATION_ERROR");
  }
  const outlet = await resolveOutlet(input.outlet);
  const area = await resolveArea(outlet.id, input.area);
  const templateId = generateChecklistTemplateId();
  const title = input.checklist_title?.trim() || input.template_name.trim();

  const row = await prisma.checklistTemplate.create({
    data: {
      templateId,
      templateName: input.template_name.trim(),
      outletId: outlet.id,
      areaId: area?.id,
      checklistTitle: title,
      taskTitle: input.task_title?.trim() || title,
      picName: input.pic_name?.trim() || null,
      picWa: input.pic_wa?.trim() || null,
      requiresPhoto: Boolean(input.requires_photo),
    },
    include: {
      outlet: true,
      area: true,
      items: true,
    },
  });

  await writeAuditLog({
    entityType: "checklist_template",
    entityId: templateId,
    action: "created",
    actorType: "leader",
  });

  return mapChecklistTemplate(row);
}

export async function saveChecklistItems(
  templateId: string,
  items: Array<{
    item_text: string;
    item_order?: number;
    requires_photo?: boolean;
    is_required?: boolean;
    active_status?: boolean;
    checklist_item_id?: string;
  }>,
): Promise<ChecklistItem[]> {
  const template = await prisma.checklistTemplate.findUnique({
    where: { templateId },
  });
  if (!template) {
    throw new ChecklistError("Template tidak ditemukan", "NOT_FOUND", 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.checklistReportItem.deleteMany({
      where: { item: { templateId } },
    });
    await tx.checklistItem.deleteMany({ where: { templateId } });

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const order = item.item_order ?? i + 1;
      await tx.checklistItem.create({
        data: {
          checklistItemId:
            item.checklist_item_id || generateChecklistItemId(i + 1),
          templateId,
          itemOrder: order,
          itemText: item.item_text.trim(),
          requiresPhoto: Boolean(item.requires_photo),
          isRequired: item.is_required !== false,
          activeStatus: item.active_status !== false,
        },
      });
    }
  });

  const refreshed = await getChecklistTemplate(templateId);
  return refreshed?.items ?? [];
}

export async function listChecklistReports(filters?: {
  outlet?: string;
  status?: string;
}) {
  const rows = await prisma.checklistReport.findMany({
    where: {
      ...(filters?.status
        ? { status: filters.status.toUpperCase() as ChecklistReportStatus }
        : {}),
      ...(filters?.outlet
        ? {
            outlet: {
              OR: [
                { code: { equals: filters.outlet, mode: "insensitive" } },
                { name: { equals: filters.outlet, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    include: {
      outlet: true,
      area: true,
      template: { include: { items: true, outlet: true, area: true } },
      items: { include: { item: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map(mapChecklistReport);
}

export async function getChecklistReportByTaskId(taskId: string) {
  const row = await prisma.checklistReport.findFirst({
    where: { taskId },
    include: {
      outlet: true,
      area: true,
      template: { include: { items: true, outlet: true, area: true } },
      items: { include: { item: true } },
    },
  });
  return row ? mapChecklistReport(row) : null;
}

export async function getChecklistByToken(
  taskId: string,
  token: string,
): Promise<ChecklistReport | null> {
  const row = await prisma.checklistReport.findFirst({
    where: { taskId, token },
    include: {
      outlet: true,
      area: true,
      template: { include: { items: true, outlet: true, area: true } },
      items: { include: { item: true } },
    },
  });
  if (row) return mapChecklistReport(row);

  if (!isGasEnabled()) return null;

  const gas = await callGasAction<ChecklistReport>(
    "getChecklistByToken",
    { task_id: taskId, token },
    "GET",
  );
  if (!gas.success || !gas.data) return null;
  return gas.data;
}

export async function generateChecklistReport(input: {
  template_id: string;
  pic_name?: string;
  pic_wa?: string;
  deadline?: string;
  recurring_template_id?: string;
  send_whatsapp?: boolean;
}) {
  const template = await prisma.checklistTemplate.findUnique({
    where: { templateId: input.template_id },
    include: {
      outlet: true,
      area: true,
      items: { where: { activeStatus: true }, orderBy: { itemOrder: "asc" } },
    },
  });
  if (!template) {
    throw new ChecklistError("Template tidak ditemukan", "NOT_FOUND", 404);
  }
  if (template.items.length === 0) {
    throw new ChecklistError(
      "Template belum punya item checklist",
      "VALIDATION_ERROR",
      422,
    );
  }

  const taskId = generateTaskId();
  const token = generateToken(32);
  const reportId = generateChecklistReportId();
  const deadline = input.deadline
    ? new Date(input.deadline)
    : new Date(Date.now() + 8 * 60 * 60 * 1000);
  const picName = input.pic_name?.trim() || template.picName || "Staff";
  const picWa = input.pic_wa?.trim() || template.picWa || "0";
  const title = template.checklistTitle || template.templateName;

  const result = await prisma.$transaction(async (tx) => {
    await tx.task.create({
      data: {
        taskId,
        token,
        createdBy: "v2-admin",
        outletId: template.outletId,
        areaId: template.areaId,
        outletName: template.outlet.name,
        areaName: template.area?.name,
        taskTitle: template.taskTitle || title,
        taskDescription: `Checklist: ${title}`,
        priority: "Medium",
        picName,
        picWa,
        deadline,
        status: "OPEN",
        checklistMode: true,
        recurringTemplateId: input.recurring_template_id ?? null,
        reportLink: buildChecklistLink(taskId, token),
        sourceVersion: "v2",
      },
    });

    const report = await tx.checklistReport.create({
      data: {
        reportId,
        taskId,
        templateId: template.templateId,
        token,
        picName,
        picWa,
        outletId: template.outletId,
        areaId: template.areaId,
        reportDate: new Date(),
        deadline,
        checklistTitle: title,
        status: "OPEN",
        sourceVersion: "v2",
        items: {
          create: template.items.map((item, index) => ({
            reportItemId: `${generateReportItemId()}-${index + 1}`,
            checklistItemId: item.checklistItemId,
            isChecked: false,
          })),
        },

      },
      include: {
        outlet: true,
        area: true,
        template: { include: { items: true, outlet: true, area: true } },
        items: { include: { item: true } },
      },
    });

    return report;
  });

  await writeAuditLog({
    entityType: "checklist_report",
    entityId: reportId,
    action: "generated",
    actorType: "leader",
    newValue: { task_id: taskId, template_id: template.templateId },
  });

  await logSyncOperation({
    operation: "generate_checklist_report",
    entityType: "checklist_report",
    entityId: reportId,
    taskId,
    outletId: template.outletId,
    picWa: picWa,
    v2Status: "success",
    v2Response: { task_id: taskId, report_id: reportId },
  });

  let waSent = false;
  let waError: string | undefined;
  if (input.send_whatsapp !== false) {
    const { sendChecklistWhatsAppViaGas } = await import(
      "@/lib/gas-whatsapp.service"
    );
    const wa = await sendChecklistWhatsAppViaGas({
      taskId,
      templateId: template.templateId,
      picName,
      picWa,
      deadline: deadline.toISOString(),
      outletId: template.outletId,
    });
    waSent = wa.sent;
    waError = wa.error;
    if (wa.sent) {
      await prisma.task.updateMany({
        where: { taskId },
        data: { waSentAt: new Date(), status: "SENT" },
      });
    }
  }

  return {
    report: mapChecklistReport(result),
    task: {
      task_id: taskId,
      token,
      report_link: buildChecklistLink(taskId, token),
      wa_sent: waSent,
      wa_error: waError,
    },
  };
}

export async function submitChecklistReport(input: {
  taskId: string;
  token: string;
  checked_items: ChecklistReportItem[];
  staff_note?: string;
  after_photo_url?: string;
}): Promise<ChecklistReport> {
  const report = await prisma.checklistReport.findFirst({
    where: { taskId: input.taskId, token: input.token },
    include: {
      template: { include: { items: true } },
      items: true,
    },
  });

  if (!report) {
    if (isGasEnabled()) {
      const gas = await callGasAction("submitChecklistReport", {
        task_id: input.taskId,
        token: input.token,
        checked_items: input.checked_items,
        staff_note: input.staff_note,
        after_photo_url: input.after_photo_url,
      });
      await logSyncOperation({
        operation: "submit_checklist",
        entityType: "checklist_report",
        entityId: input.taskId,
        v1Status: gas.success ? "success" : "failed",
        v2Status: "failed",
        v1Response: gas.raw ?? { error: gas.error },
        errorMessage: gas.success
          ? "Checklist hanya di GAS"
          : gas.error,
      });
      if (!gas.success) {
        throw new ChecklistError(
          gas.error ?? "Gagal submit checklist",
          "GAS_FALLBACK_FAILED",
          502,
        );
      }
      const fallback = await getChecklistByToken(input.taskId, input.token);
      if (fallback) return { ...fallback, status: "SUBMITTED" };
    }
    throw new ChecklistError("Checklist tidak ditemukan", "NOT_FOUND", 404);
  }

  if (["DONE"].includes(report.status)) {
    throw new ChecklistError(
      "Checklist sudah diverifikasi",
      "ALREADY_DONE",
      422,
    );
  }

  const activeItems = report.template.items.filter((i) => i.activeStatus);
  for (const item of activeItems) {
    if (!item.isRequired) continue;
    const checked = input.checked_items.find(
      (c) => c.checklist_item_id === item.checklistItemId,
    );
    if (!checked?.is_checked) {
      throw new ChecklistError(
        `Item wajib belum dicentang: ${item.itemText}`,
        "VALIDATION_ERROR",
        422,
      );
    }
    if (item.requiresPhoto && !checked.photo_url) {
      throw new ChecklistError(
        `Foto wajib untuk item: ${item.itemText}`,
        "PHOTO_REQUIRED",
        422,
      );
    }
  }

  const isLate = new Date() > report.deadline;
  const nextStatus: ChecklistReportStatus =
    report.status === "REVISI" ? "SUBMITTED" : "SUBMITTED";

  await prisma.$transaction(async (tx) => {
    for (const checked of input.checked_items) {
      await tx.checklistReportItem.upsert({
        where: {
          reportId_checklistItemId: {
            reportId: report.reportId,
            checklistItemId: checked.checklist_item_id,
          },
        },
        create: {
          reportItemId: generateReportItemId(),
          reportId: report.reportId,
          checklistItemId: checked.checklist_item_id,
          isChecked: Boolean(checked.is_checked),
          photoUrl: checked.photo_url ?? null,
          checkedAt: checked.is_checked ? new Date() : null,
        },
        update: {
          isChecked: Boolean(checked.is_checked),
          photoUrl: checked.photo_url ?? null,
          checkedAt: checked.is_checked ? new Date() : null,
        },
      });
    }

    await tx.checklistReport.update({
      where: { id: report.id },
      data: {
        status: nextStatus,
        submittedAt: new Date(),
        staffNote: input.staff_note?.trim() || null,
        afterPhotoUrl: input.after_photo_url ?? null,
        isLate,
      },
    });

    if (report.taskId) {
      await tx.task.updateMany({
        where: { taskId: report.taskId },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          staffNote: input.staff_note?.trim() || null,
          afterPhotoUrl: input.after_photo_url ?? null,
          isLate,
        },
      });
    }
  });

  await writeAuditLog({
    entityType: "checklist_report",
    entityId: report.reportId,
    action: "submitted",
    actorType: "staff",
  });

  if (dualWriteEnabled() && isGasEnabled()) {
    const gas = await callGasAction("submitChecklistReport", {
      task_id: input.taskId,
      token: input.token,
      checked_items: input.checked_items,
      staff_note: input.staff_note,
      after_photo_url: input.after_photo_url,
    });
    await logSyncOperation({
      operation: "submit_checklist",
      entityType: "checklist_report",
      entityId: report.reportId,
      v1Status: gas.success ? "success" : "failed",
      v2Status: "success",
      v1Response: gas.raw ?? { error: gas.error },
      errorMessage: gas.success ? null : gas.error,
    });
  } else {
    await logSyncOperation({
      operation: "submit_checklist",
      entityType: "checklist_report",
      entityId: report.reportId,
      v2Status: "success",
    });
  }

  const refreshed = await getChecklistReportByTaskId(input.taskId);
  if (!refreshed) {
    throw new ChecklistError("Gagal memuat hasil submit", "NOT_FOUND", 500);
  }
  return refreshed;
}

export async function verifyChecklistReport(
  taskId: string,
  note?: string,
  verifiedBy?: string,
) {
  const report = await prisma.checklistReport.findFirst({ where: { taskId } });
  if (!report) {
    throw new ChecklistError("Checklist tidak ditemukan", "NOT_FOUND", 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.checklistReport.update({
      where: { id: report.id },
      data: {
        status: "DONE",
        verifiedAt: new Date(),
        verifiedBy: verifiedBy ?? "v2-admin",
        revisionNote: note ?? null,
      },
    });

    if (report.taskId) {
      await tx.task.updateMany({
        where: { taskId: report.taskId },
        data: {
          status: "DONE",
          verifiedAt: new Date(),
          verifiedBy: verifiedBy ?? "v2-admin",
          leaderVerification: note ?? null,
          finalStatus: "DONE",
        },
      });
    }
  });

  await writeAuditLog({
    entityType: "checklist_report",
    entityId: report.reportId,
    action: "verified",
    actorType: "leader",
    actorName: verifiedBy,
  });

  return getChecklistReportByTaskId(taskId);
}

export async function requestChecklistRevision(
  taskId: string,
  revisionNote: string,
  verifiedBy?: string,
) {
  if (!revisionNote?.trim()) {
    throw new ChecklistError("Catatan revisi wajib", "VALIDATION_ERROR");
  }
  const report = await prisma.checklistReport.findFirst({ where: { taskId } });
  if (!report) {
    throw new ChecklistError("Checklist tidak ditemukan", "NOT_FOUND", 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.checklistReport.update({
      where: { id: report.id },
      data: {
        status: "REVISI",
        revisionNote: revisionNote.trim(),
        revisionCount: { increment: 1 },
        verifiedBy: verifiedBy ?? "v2-admin",
        verifiedAt: new Date(),
      },
    });

    if (report.taskId) {
      await tx.task.updateMany({
        where: { taskId: report.taskId },
        data: {
          status: "REVISION_REQUESTED",
          leaderVerification: revisionNote.trim(),
          verifiedBy: verifiedBy ?? "v2-admin",
          verifiedAt: new Date(),
        },
      });
    }
  });

  await writeAuditLog({
    entityType: "checklist_report",
    entityId: report.reportId,
    action: "revision_requested",
    actorType: "leader",
    newValue: { revision_note: revisionNote },
  });

  return getChecklistReportByTaskId(taskId);
}

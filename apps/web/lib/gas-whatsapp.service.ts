import {
  deliverWhatsApp,
  mapLegacyWaSent,
  shouldTryGasDelivery,
} from "@/lib/services/whatsapp.service";
import {
  callGasAction,
  isGasEnabled,
} from "@/lib/services/gas-adapter.service";
import { logSyncOperation } from "@/lib/services/dual-write.service";
import { prisma } from "@/lib/db";
import { buildChecklistLink } from "@/lib/id";
import { buildChecklistWaMessage } from "@/lib/wa-message";

export function gasWhatsAppEnabled(): boolean {
  return shouldTryGasDelivery() && isGasEnabled();
}

export async function sendChecklistWhatsAppViaGas(input: {
  taskId: string;
  templateId?: string;
  picName?: string;
  picWa?: string;
  deadline?: string;
  outletId?: string;
  templateTitle?: string;
  outletName?: string;
}): Promise<{ sent: boolean; error?: string; wa_link?: string }> {
  const task = await prisma.task.findUnique({
    where: { taskId: input.taskId },
    include: { outlet: true },
  });
  if (!task) {
    return { sent: false, error: "TASK_NOT_FOUND" };
  }

  const link = buildChecklistLink(task.taskId, task.token);
  const message = buildChecklistWaMessage({
    pic_name: input.picName || task.picName,
    report_link: link,
    template_title: input.templateTitle,
    deadline: input.deadline || task.deadline.toISOString(),
    outlet: input.outletName || task.outletName || task.outlet?.name || undefined,
  });

  let result = await deliverWhatsApp({
    to: input.picWa || task.picWa,
    message,
    gas: {
      action: "resendChecklistWhatsApp",
      payload: { task_id: input.taskId },
    },
    log: {
      operation: "send_checklist_wa",
      entityType: "checklist_report",
      entityId: input.taskId,
      taskId: input.taskId,
      outletId: input.outletId ?? task.outletId,
      picWa: input.picWa ?? task.picWa,
    },
  });

  if (
    !result.auto_sent &&
    input.templateId &&
    shouldTryGasDelivery() &&
    isGasEnabled()
  ) {
    const generate = await callGasAction("generateChecklistReport", {
      template_id: input.templateId,
      task_id: input.taskId,
      pic_name: input.picName,
      pic_wa: input.picWa,
      deadline: input.deadline,
    });
    if (generate.success) {
      return { sent: true };
    }
  }

  return mapLegacyWaSent(result);
}

export async function resendChecklistWhatsApp(
  taskId: string,
): Promise<{ auto_sent: boolean; wa_link: string; error?: string }> {
  const task = await prisma.task.findUnique({
    where: { taskId },
    include: {
      outlet: true,
      checklistReports: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: { template: true },
      },
    },
  });
  if (!task) {
    throw new Error("Tugas checklist tidak ditemukan");
  }

  const report = task.checklistReports[0];
  const message = buildChecklistWaMessage({
    pic_name: task.picName,
    report_link: buildChecklistLink(task.taskId, task.token),
    template_title:
      report?.template?.checklistTitle ||
      report?.checklistTitle ||
      undefined,
    deadline: task.deadline.toISOString(),
    outlet: task.outletName || task.outlet?.name || undefined,
  });

  const result = await deliverWhatsApp({
    to: task.picWa,
    message,
    gas: {
      action: "resendChecklistWhatsApp",
      payload: { task_id: taskId },
    },
    log: {
      operation: "resend_checklist_wa",
      entityType: "checklist_report",
      entityId: taskId,
      taskId,
      outletId: task.outletId,
      picWa: task.picWa,
    },
  });

  return {
    auto_sent: result.auto_sent,
    wa_link: result.wa_link,
    error: result.error,
  };
}

export async function sendTaskWhatsAppViaGas(input: {
  taskId: string;
  picWa?: string;
  outletId?: string;
  message?: string;
}): Promise<{ sent: boolean; error?: string; wa_link?: string }> {
  const task = await prisma.task.findUnique({
    where: { taskId: input.taskId },
    include: { outlet: true },
  });
  if (!task) {
    return { sent: false, error: "TASK_NOT_FOUND" };
  }

  const { buildTaskWaMessage } = await import("@/lib/wa-message");
  const { buildReportLink } = await import("@/lib/id");
  const message =
    input.message ??
    buildTaskWaMessage({
      task_title: task.taskTitle,
      pic_name: task.picName,
      deadline: task.deadline.toISOString(),
      report_link: buildReportLink(task.taskId, task.token),
      outlet: task.outletName || task.outlet?.name || undefined,
    });

  const result = await deliverWhatsApp({
    to: input.picWa || task.picWa,
    message,
    gas: {
      action: "resendWhatsApp",
      payload: { task_id: input.taskId },
    },
    log: {
      operation: "send_task_wa",
      entityType: "task",
      entityId: input.taskId,
      taskId: input.taskId,
      outletId: input.outletId ?? task.outletId,
      picWa: input.picWa ?? task.picWa,
    },
  });

  return mapLegacyWaSent(result);
}

/** @deprecated Prefer deliverWhatsApp — kept for direct GAS-only callers during migration. */
export async function logGasSkipped(
  operation: string,
  entityType: string,
  entityId: string,
) {
  await logSyncOperation({
    operation,
    entityType,
    entityId,
    v2Status: "partial",
    v2Response: { skipped: true, reason: "GAS_NOT_CONFIGURED" },
  });
}

import {
  callGasAction,
  isGasEnabled,
} from "@/lib/services/gas-adapter.service";
import { logSyncOperation } from "@/lib/services/dual-write.service";

export function gasWhatsAppEnabled(): boolean {
  return isGasEnabled();
}

export async function sendChecklistWhatsAppViaGas(input: {
  taskId: string;
  templateId?: string;
  picName?: string;
  picWa?: string;
  deadline?: string;
  outletId?: string;
}): Promise<{ sent: boolean; error?: string }> {
  if (!gasWhatsAppEnabled()) {
    await logSyncOperation({
      operation: "send_checklist_wa",
      entityType: "checklist_report",
      entityId: input.taskId,
      taskId: input.taskId,
      outletId: input.outletId,
      picWa: input.picWa,
      v2Status: "partial",
      v2Response: { skipped: true, reason: "GAS_NOT_CONFIGURED" },
    });
    return { sent: false, error: "GAS_NOT_CONFIGURED" };
  }

  let gas = await callGasAction("resendChecklistWhatsApp", {
    task_id: input.taskId,
  });

  if (!gas.success && input.templateId) {
    gas = await callGasAction("generateChecklistReport", {
      template_id: input.templateId,
      task_id: input.taskId,
      pic_name: input.picName,
      pic_wa: input.picWa,
      deadline: input.deadline,
    });
  }

  await logSyncOperation({
    operation: "send_checklist_wa",
    entityType: "checklist_report",
    entityId: input.taskId,
    taskId: input.taskId,
    outletId: input.outletId,
    picWa: input.picWa,
    v1Status: gas.success ? "success" : "failed",
    v2Status: "success",
    v1Response: gas.raw ?? { error: gas.error },
    errorMessage: gas.success ? null : (gas.error ?? "GAGAL_KIRIM_WA"),
  });

  return gas.success
    ? { sent: true }
    : { sent: false, error: gas.error ?? "GAGAL_KIRIM_WA" };
}

export async function resendChecklistWhatsApp(taskId: string): Promise<void> {
  if (!gasWhatsAppEnabled()) {
    throw new Error(
      "WhatsApp checklist masih via GAS — set GAS_WEB_APP_URL dan GAS_FALLBACK_ENABLED=true",
    );
  }

  const gas = await callGasAction("resendChecklistWhatsApp", { task_id: taskId });
  await logSyncOperation({
    operation: "resend_checklist_wa",
    entityType: "checklist_report",
    entityId: taskId,
    taskId,
    v1Status: gas.success ? "success" : "failed",
    v2Status: "success",
    v1Response: gas.raw ?? { error: gas.error },
    errorMessage: gas.success ? null : (gas.error ?? "Gagal kirim ulang WA checklist"),
  });

  if (!gas.success) {
    throw new Error(gas.error ?? "Gagal kirim ulang WA checklist");
  }
}

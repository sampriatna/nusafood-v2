import type {
  DisciplinaryLetter,
  DisciplinaryNotifyResult,
} from "@nusafood/types";
import { logSyncOperation } from "@/lib/services/dual-write.service";
import {
  callGasAction,
  isGasEnabled,
} from "@/lib/services/gas-adapter.service";
import { getStaffById } from "@/lib/services/staff.service";
import {
  buildDisciplinaryWaMessage,
  buildWaMeLink,
  normalizeWa,
} from "./wa-message";

function isUnknownGasAction(error?: string): boolean {
  return Boolean(error?.includes("UNKNOWN_ACTION"));
}

async function tryGasSendDisciplinary(input: {
  letter: DisciplinaryLetter;
  employeeWa: string;
  message: string;
}): Promise<{ sent: boolean; error?: string; action?: string }> {
  const basePayload = {
    letter_id: input.letter.id,
    letter_number: input.letter.letter_number,
    employee_id: input.letter.employee_id,
    employee_wa: input.employeeWa,
    message: input.message,
    pdf_url: input.letter.pdf_url || undefined,
    type: input.letter.type,
    level: input.letter.level,
  };

  // Action khusus (jika sudah ditambahkan di GAS v1)
  const dedicated = await callGasAction("sendDisciplinaryWhatsApp", basePayload);
  if (dedicated.success) {
    return { sent: true, action: "sendDisciplinaryWhatsApp" };
  }
  if (!isUnknownGasAction(dedicated.error)) {
    return { sent: false, error: dedicated.error, action: "sendDisciplinaryWhatsApp" };
  }

  // Fallback: reuse action kendala daily report yang sudah ada di GAS v1
  const fallback = await callGasAction("notifyDailyReportIssue", {
    staff_id: input.letter.employee_id,
    staff_name: input.letter.employee_name_snapshot,
    outlet: input.letter.outlet_name_snapshot,
    position: input.letter.employee_position_snapshot || "Staff",
    activity_title: input.letter.title,
    status_condition: "follow_up_leader",
    note:
      input.letter.type === "TEGURAN"
        ? `Surat Teguran Level ${input.letter.level}`
        : `Surat Peringatan Level ${input.letter.level}`,
    message: input.message,
    leader_wa_list: [input.employeeWa],
  });
  if (fallback.success) {
    return { sent: true, action: "notifyDailyReportIssue" };
  }

  return {
    sent: false,
    error: fallback.error || dedicated.error || "GAS_REJECTED",
    action: "notifyDailyReportIssue",
  };
}

export async function notifyEmployeeOnDisciplinaryLetter(
  letter: DisciplinaryLetter,
): Promise<DisciplinaryNotifyResult> {
  const message = buildDisciplinaryWaMessage(letter);
  const staff = await getStaffById(letter.employee_id);
  const waRaw = staff?.wa_number || "";
  const employeeWa = normalizeWa(waRaw);
  const wa_link = employeeWa ? buildWaMeLink(waRaw, message) : "";

  if (!employeeWa) {
    await logSyncOperation({
      operation: "send_disciplinary_wa",
      entityType: "disciplinary_letter",
      entityId: letter.id,
      v1Status: "failed",
      v2Status: "partial",
      errorMessage: "NO_EMPLOYEE_WA",
      v2Response: { employee_id: letter.employee_id },
    });
    return {
      gas_sent: false,
      gas_error: "NO_EMPLOYEE_WA",
      message,
      wa_link: "",
    };
  }

  let gas_sent = false;
  let gas_error: string | undefined;

  if (isGasEnabled()) {
    const gas = await tryGasSendDisciplinary({
      letter,
      employeeWa,
      message,
    });
    gas_sent = gas.sent;
    gas_error = gas.sent ? undefined : gas.error || "GAS_REJECTED";

    await logSyncOperation({
      operation: "send_disciplinary_wa",
      entityType: "disciplinary_letter",
      entityId: letter.id,
      picWa: employeeWa,
      v1Status: gas_sent ? "success" : "failed",
      v2Status: "success",
      v1Response: { action: gas.action, error: gas.error },
      errorMessage: gas_sent ? null : gas_error ?? "GAGAL_KIRIM_WA",
      v2Response: {
        letter_number: letter.letter_number,
        employee_id: letter.employee_id,
        gas_action: gas.action,
      },
    });
  } else {
    gas_error = "GAS_NOT_CONFIGURED";
    await logSyncOperation({
      operation: "send_disciplinary_wa",
      entityType: "disciplinary_letter",
      entityId: letter.id,
      picWa: employeeWa,
      v2Status: "partial",
      v2Response: { skipped: true, reason: "GAS_NOT_CONFIGURED" },
      errorMessage: gas_error,
    });
  }

  return {
    gas_sent,
    gas_error,
    employee_wa: employeeWa,
    wa_link,
    message,
  };
}

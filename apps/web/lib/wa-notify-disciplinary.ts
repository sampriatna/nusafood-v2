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
    const gas = await callGasAction("sendDisciplinaryWhatsApp", {
      letter_id: letter.id,
      letter_number: letter.letter_number,
      employee_id: letter.employee_id,
      employee_wa: employeeWa,
      message,
      pdf_url: letter.pdf_url || undefined,
      type: letter.type,
      level: letter.level,
    });
    gas_sent = gas.success;
    gas_error = gas.success ? undefined : gas.error || "GAS_REJECTED";

    await logSyncOperation({
      operation: "send_disciplinary_wa",
      entityType: "disciplinary_letter",
      entityId: letter.id,
      picWa: employeeWa,
      v1Status: gas.success ? "success" : "failed",
      v2Status: "success",
      v1Response: gas.raw ?? { error: gas.error },
      errorMessage: gas.success ? null : gas.error ?? "GAGAL_KIRIM_WA",
      v2Response: {
        letter_number: letter.letter_number,
        employee_id: letter.employee_id,
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

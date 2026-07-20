import type { ReportConditionStatus, Staff } from "@nusafood/types";
import { getStaffCache } from "./staff-report-store";
import {
  buildKendalaWaMessage,
  buildWaMeLink,
  normalizeWa,
} from "./wa-message";

export type LeaderNotifyTarget = {
  staff_id: string;
  name: string;
  wa_number: string;
  outlet: string;
  wa_link: string;
};

export type KendalaNotifyResult = {
  needed: boolean;
  gas_sent: boolean;
  gas_error?: string;
  leaders: LeaderNotifyTarget[];
  message: string;
};

export function findLeadersForOutlet(outlet: string): Staff[] {
  const staff = getStaffCache().filter((s) => s.status === "ACTIVE");
  const sameOutletLeaders = staff.filter(
    (s) =>
      (s.role === "LEADER" || s.role === "ADMIN") &&
      s.outlet === outlet &&
      s.wa_number
  );
  if (sameOutletLeaders.length > 0) return sameOutletLeaders;

  return staff.filter(
    (s) => (s.role === "LEADER" || s.role === "ADMIN") && s.wa_number
  );
}

async function tryGasNotify(payload: Record<string, unknown>): Promise<{
  sent: boolean;
  error?: string;
}> {
  const gasUrl = process.env.GAS_WEB_APP_URL;
  const adminApiKey = process.env.ADMIN_API_KEY;
  if (!gasUrl || !adminApiKey) {
    return { sent: false, error: "GAS_NOT_CONFIGURED" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "notifyDailyReportIssue",
        admin_secret: adminApiKey,
        api_key: adminApiKey,
        ...payload,
      }),
      signal: controller.signal,
    });
    const text = await response.text();
    let data: { success?: boolean; error?: string } = {};
    try {
      data = JSON.parse(text);
    } catch {
      return { sent: false, error: "GAS_NON_JSON" };
    }
    if (data.success) return { sent: true };
    return { sent: false, error: data.error || "GAS_REJECTED" };
  } catch (e) {
    return {
      sent: false,
      error: e instanceof Error ? e.message : "GAS_FETCH_FAILED",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function notifyLeadersOnKendala(input: {
  staff_name: string;
  staff_id: string;
  outlet: string;
  position: string;
  activity_title: string;
  status_condition: ReportConditionStatus;
  note: string;
  checklist_summary?: string;
  report_date?: string;
  submission_id?: string;
}): Promise<KendalaNotifyResult> {
  if (input.status_condition === "aman") {
    return { needed: false, gas_sent: false, leaders: [], message: "" };
  }

  const message = buildKendalaWaMessage(input);
  const leadersRaw = findLeadersForOutlet(input.outlet);
  const leaders: LeaderNotifyTarget[] = leadersRaw
    .map((l) => ({
      staff_id: l.staff_id,
      name: l.name,
      wa_number: normalizeWa(l.wa_number),
      outlet: l.outlet,
      wa_link: buildWaMeLink(l.wa_number, message),
    }))
    .filter((l) => l.wa_number && l.wa_link);

  let gas_sent = false;
  let gas_error: string | undefined;

  if (leaders.length > 0) {
    const gas = await tryGasNotify({
      staff_id: input.staff_id,
      staff_name: input.staff_name,
      outlet: input.outlet,
      position: input.position,
      activity_title: input.activity_title,
      status_condition: input.status_condition,
      note: input.note,
      checklist_summary: input.checklist_summary,
      report_date: input.report_date,
      submission_id: input.submission_id,
      leader_wa_list: leaders.map((l) => l.wa_number),
      message,
    });
    gas_sent = gas.sent;
    gas_error = gas.error;
  } else {
    gas_error = "NO_LEADER_WA";
  }

  return {
    needed: true,
    gas_sent,
    gas_error,
    leaders,
    message,
  };
}

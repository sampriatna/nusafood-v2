import type { ReportConditionStatus } from "@nusafood/types";

export function normalizeWa(wa: string): string {
  const digits = (wa || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

function conditionLabel(c: ReportConditionStatus): string {
  switch (c) {
    case "kendala_ringan":
      return "Ada kendala ringan";
    case "follow_up_leader":
      return "Perlu follow up leader";
    case "perlu_belanja":
      return "Perlu belanja/perbaikan";
    default:
      return c;
  }
}

export function buildKendalaWaMessage(input: {
  staff_name: string;
  outlet: string;
  position: string;
  activity_title: string;
  status_condition: ReportConditionStatus;
  note: string;
  checklist_summary?: string;
  report_date?: string;
}): string {
  const lines = [
    `🚨 *Kendala Daily Activity*`,
    ``,
    `Staff: *${input.staff_name}*`,
    `Outlet: ${input.outlet}`,
    `Jabatan: ${input.position}`,
    `Kegiatan: *${input.activity_title}*`,
    `Status: ${conditionLabel(input.status_condition)}`,
  ];
  if (input.checklist_summary) {
    lines.push(`Checklist: ${input.checklist_summary}`);
  }
  if (input.note) {
    lines.push(`Catatan: ${input.note}`);
  }
  if (input.report_date) {
    lines.push(`Tanggal: ${input.report_date}`);
  }
  lines.push(``, `Mohon follow up ya, Leader.`);
  return lines.join("\n");
}

export function buildWaMeLink(waNumber: string, message: string): string {
  const wa = normalizeWa(waNumber);
  if (!wa) return "";
  return `https://wa.me/${wa}?text=${encodeURIComponent(message)}`;
}

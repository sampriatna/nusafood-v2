import { prisma } from "@/lib/db";
import {
  resolveDailyReportIssueLanguage,
  type DailyReportRouteType,
} from "@/lib/daily-report-issue-language-seed";
import {
  routeDailyReportIssue as routeDailyReportIssueBase,
  type DailyReportRoutingResult,
} from "@/lib/services/daily-report-routing.service";
import type { ReportConditionStatus } from "@nusafood/types";

const TASK_PREFIX: Record<DailyReportRouteType, string> = {
  safety: "Keselamatan",
  maintenance: "Perbaikan & Alat",
  cleaning: "Kebersihan & Area",
  finance: "Kas & Pembayaran",
  purchasing: "Belanja & Pengadaan",
  stock: "Stok & Bahan",
  service: "Pelayanan & Operasional",
  other: "Tindak Lanjut",
};

type RouteInput = {
  submission_id: string;
  staff_id: string;
  staff_name: string;
  outlet: string;
  position: string;
  activity_title: string;
  status_condition: ReportConditionStatus;
  note: string;
  photo_url?: string | null;
  checklist_summary?: string;
};

function buildSeededDescription(
  input: RouteInput,
  result: DailyReportRoutingResult,
): { title: string; description: string } {
  const language = resolveDailyReportIssueLanguage({
    routeType: result.route_type,
    note: input.note,
    activityTitle: input.activity_title,
  });
  const rawNote = input.note.trim() || "Tidak ada catatan tambahan dari pelapor.";
  const title = `${TASK_PREFIX[result.route_type]} — ${language.subject}`;
  const steps = language.steps.map((step, index) => `${index + 1}. ${step}`);
  const standards = language.standards.map((standard) => `- ${standard}`);

  const description = [
    "Temuan:",
    `${input.staff_name} (${input.position} · ${input.outlet})`,
    "",
    "Kategori:",
    result.route_label,
    "",
    "Kegiatan asal:",
    input.activity_title,
    "",
    "Masalah:",
    language.problem,
    "",
    "Catatan:",
    `Laporan asli staff: ${rawNote}`,
    input.checklist_summary ? `Checklist saat dilaporkan: ${input.checklist_summary}` : null,
    `Template bahasa: ${language.seed_id}`,
    "",
    "Yang dikerjakan:",
    ...steps,
    "",
    "Standar selesai:",
    ...standards,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return { title, description };
}

/**
 * Routing assignment tetap memakai service lama. Setelah task berhasil dibuat,
 * bahasa task distandarkan dari seed supaya PIC menerima instruksi yang jelas
 * walaupun catatan staff singkat/tidak rapi.
 */
export async function routeDailyReportIssue(
  input: RouteInput,
): Promise<DailyReportRoutingResult> {
  const result = await routeDailyReportIssueBase(input);

  if (!result.routed || result.already_routed || !result.task_id) {
    return result;
  }

  const seeded = buildSeededDescription(input, result);

  try {
    await prisma.task.update({
      where: { taskId: result.task_id },
      data: {
        taskTitle: seeded.title,
        taskDescription: seeded.description,
      },
    });
  } catch (error) {
    // Standardisasi bahasa tidak boleh membatalkan routing utama.
    console.error("[daily-report seeded language]", error);
  }

  return result;
}

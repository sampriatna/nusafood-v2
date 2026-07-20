/**
 * Leader Monitoring — kontrol lapangan di atas Daily Report staff.
 * Templates + submissions in-memory (v1); staff validation via Prisma daily-activity.service.
 */

import type {
  LeaderMonitorTemplate,
  LeaderMonitorSubmission,
  LeaderMonitorKind,
  LeaderMonitorStatus,
  LeaderItemScore,
  LeaderFollowUpStatus,
  SubmitLeaderMonitorPayload,
  LeaderMonitorFilters,
  LeaderMonitorDashboardData,
  LeaderMonitorDashboardSummary,
  DailyReportSubmission,
  StaffReportValidationStatus,
  ValidateStaffReportPayload,
} from "@nusafood/types";
import {
  applyLeaderValidation as applyLeaderValidationDb,
  getSubmissionById,
  listSubmissionsNeedingFix,
} from "@/lib/services/daily-activity.service";
import { listStaff } from "@/lib/services/staff.service";

function nowISO() {
  return new Date().toISOString();
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function ci(
  templateId: string,
  texts: string[],
): LeaderMonitorTemplate["checklist"] {
  return texts.map((item_text, i) => ({
    id: `${templateId}-CI-${String(i + 1).padStart(2, "0")}`,
    item_text,
    sort_order: i + 1,
  }));
}

const seedTemplates: LeaderMonitorTemplate[] = [
  {
    id: "LMT-OPEN",
    kind: "opening_control",
    title: "Opening Control Leader",
    menu_label: "Opening Control",
    description: "Cek fisik opening sebelum/siap buka — bukan cuma lihat submit staff.",
    standard_result:
      "Outlet siap buka, area customer bersih, staff di posisi, toilet aman, area depan rapi.",
    outlet_id: "KBU",
    target_time_start: "09:30",
    target_time_end: "10:15",
    photo_mode: "required",
    active: true,
    sort_order: 1,
    checklist: ci("LMT-OPEN", [
      "Area depan outlet bersih dari sampah kecil, daun, puntung rokok, plastik, dan tisu",
      "Parkiran dan jalur masuk customer aman, tidak licin, tidak becek, tidak berantakan",
      "Area meja customer sudah rapi dan siap dipakai",
      "Meja tidak lengket, tidak ada noda makanan/minuman",
      "Kursi tersusun rapi sesuai layout",
      "Toilet customer bersih, tidak bau, lantai aman, wastafel bersih",
      "Tempat sampah customer dan toilet tidak penuh",
      "Area kasir/bar sudah rapi dan siap operasional",
      "Area dapur tidak berantakan sebelum jam buka",
      "Staff hadir, grooming layak, dan sudah tahu posisi kerja masing-masing",
      "Checklist PA/OB sudah dicek fisik minimal 3 titik",
      "Jika laporan staff tidak sesuai lapangan, pilih status Ada catatan / Tidak sesuai",
    ]),
  },
  {
    id: "LMT-RAMAI",
    kind: "jam_ramai_control",
    title: "Kontrol Operasional Jam Ramai",
    menu_label: "Jam Ramai Control",
    description: "Kontrol saat customer ramai — area, order, staff, toilet.",
    standard_result:
      "Area tetap bersih, meja cepat dibersihkan, order tidak numpuk parah, pelayanan tetap jalan.",
    outlet_id: "KBU",
    target_time_start: "12:00",
    target_time_end: "14:00",
    photo_mode: "required_if_issue",
    active: true,
    sort_order: 2,
    checklist: ci("LMT-RAMAI", [
      "Meja bekas customer dibersihkan maksimal 5 menit setelah customer pergi",
      "Tidak ada piring/gelas kotor menumpuk di area customer",
      "Lantai area makan tidak penuh remah, tisu, tulang, nasi, atau sampah kecil",
      "Toilet tetap dicek, tidak menunggu sampai closing",
      "Tempat sampah tidak penuh atau bau",
      "Staff floor/waiters aktif melihat meja kosong dan meja kotor",
      "Kasir tidak membiarkan antrean tanpa arahan",
      "Dapur/bar tidak menumpuk order tanpa komunikasi ke leader",
      "Jika ada menu kosong, leader tahu dan sudah update ke kasir/waiters",
      "Customer yang terlihat menunggu lama dicek penyebabnya",
      "Area depan tetap rapi meskipun ramai",
      "Kendala operasional ditulis, bukan hanya disimpan di kepala",
    ]),
  },
  {
    id: "LMT-SPOT",
    kind: "spot_check_area",
    title: "Spot Check PA / OB",
    menu_label: "Spot Check Area",
    description:
      "Validasi hasil kerja PA/OB di lapangan. Jangan validasi hanya karena sudah submit.",
    standard_result:
      "Minimal 5 titik dicek fisik; laporan staff sesuai kondisi nyata atau ditandai revisi/tidak valid.",
    outlet_id: "KBU",
    target_time_start: "11:00",
    target_time_end: "20:00",
    photo_mode: "required",
    active: true,
    sort_order: 3,
    checklist: ci("LMT-SPOT", [
      "Cek toilet customer secara fisik, bukan hanya dari foto",
      "Cek area bawah meja customer",
      "Cek tempat sampah customer",
      "Cek area depan outlet / parkiran",
      "Cek tanaman / pot / area rumput kecil",
      "Cek lantai area makan apakah masih lengket atau kotor",
      "Cek apakah ada bau tidak enak di toilet, sampah, atau area lembap",
      "Bandingkan foto laporan staff dengan kondisi lapangan",
      "Jika foto tidak sesuai, blur, terlalu dekat, atau foto lama → tandai tidak valid",
      "Jika pekerjaan belum sesuai standar, staff wajib ulang saat itu juga",
      "Catat nama staff yang harus perbaikan",
      "Foto ulang kondisi setelah diperbaiki (jika sudah)",
    ]),
  },
  {
    id: "LMT-CLOSE",
    kind: "closing_control",
    title: "Closing Control Leader",
    menu_label: "Closing Control",
    description: "Audit closing — outlet aman ditinggal, tidak wariskan kotoran ke besok.",
    standard_result:
      "Outlet ditutup bersih, aman, rapi; tidak meninggalkan kerjaan kotor untuk pagi.",
    outlet_id: "KBU",
    target_time_start: "21:30",
    target_time_end: "22:15",
    photo_mode: "required",
    active: true,
    sort_order: 4,
    checklist: ci("LMT-CLOSE", [
      "Semua meja customer sudah bersih dan tidak lengket",
      "Kursi sudah dirapikan",
      "Lantai area customer sudah disapu dan titik kotor sudah dipel",
      "Kolong meja dicek dari sampah tersembunyi",
      "Toilet closing dicek ulang: kloset, lantai, wastafel, tempat sampah, bau",
      "Tempat sampah penuh sudah dibuang",
      "Area depan outlet tidak menyisakan sampah malam",
      "Tanaman/area outdoor aman dan tidak berantakan",
      "Peralatan kebersihan dikembalikan ke tempatnya",
      "Area kasir/bar rapi sebelum ditinggal",
      "Area dapur tidak meninggalkan sisa bahan/bau/kotoran yang mengganggu besok",
      "Masalah closing dicatat dan ditag ke staff terkait",
    ]),
  },
  {
    id: "LMT-ISSUE",
    kind: "issue_log",
    title: "Log Masalah Operasional",
    menu_label: "Issue Log / Catatan Masalah",
    description: "Catat masalah operasional supaya tidak hilang — follow up sampai selesai.",
    standard_result: "Masalah tercatat jelas: area, staff, tindakan, status follow up.",
    outlet_id: null,
    photo_mode: "required_if_issue",
    active: true,
    sort_order: 5,
    checklist: ci("LMT-ISSUE", [
      "Area masalah sudah jelas",
      "Masalah digambarkan konkret (bukan hanya 'kotor')",
      "Staff terkait dicatat",
      "Dampak ke operasional disebutkan",
      "Tindakan sementara sudah dilakukan / diinstruksikan",
      "Butuh follow up owner/admin sudah diputuskan",
      "Deadline perbaikan diisi jika perlu",
      "Status follow up di-update (Open / On Progress / Selesai)",
    ]),
  },
];

type StoreState = {
  templates: LeaderMonitorTemplate[];
  submissions: LeaderMonitorSubmission[];
};

const globalKey = "__nusa_leader_monitor_store_v1__";

function getState(): StoreState {
  const g = globalThis as unknown as Record<string, StoreState | undefined>;
  if (!g[globalKey]) {
    g[globalKey] = {
      templates: seedTemplates.map((t) => ({ ...t, checklist: [...t.checklist] })),
      submissions: [],
    };
  }
  return g[globalKey]!;
}

export function listLeaderMonitorTemplates(
  outlet?: string,
): LeaderMonitorTemplate[] {
  return getState()
    .templates.filter((t) => t.active)
    .filter((t) => !t.outlet_id || !outlet || outlet === "ALL" || t.outlet_id === outlet)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function getLeaderMonitorTemplate(
  idOrKind: string,
): LeaderMonitorTemplate | null {
  const t = getState().templates.find(
    (x) => x.id === idOrKind || x.kind === idOrKind,
  );
  return t || null;
}

function computeStatusFromScores(
  scores: { score: LeaderItemScore }[],
  fallback: LeaderMonitorStatus,
): LeaderMonitorStatus {
  if (scores.length === 0) return fallback;
  if (scores.some((s) => s.score === 0)) return "tidak_sesuai";
  if (scores.some((s) => s.score === 1)) return "ada_catatan";
  return "aman";
}

export async function submitLeaderMonitor(
  payload: SubmitLeaderMonitorPayload,
): Promise<
  { success: true; data: LeaderMonitorSubmission } | { success: false; error: string }
> {
  const template = getState().templates.find((t) => t.id === payload.template_id);
  if (!template || !template.active) {
    return { success: false, error: "Template monitoring tidak ditemukan." };
  }

  if (!payload.outlet_id) {
    return { success: false, error: "Outlet wajib diisi." };
  }

  const scoresInput = payload.checklist_scores || [];
  if (template.checklist.length > 0 && scoresInput.length === 0) {
    return { success: false, error: "Isi skor checklist (Aman / Catatan / Gagal)." };
  }

  const scoreMap = new Map(scoresInput.map((s) => [s.item_id, s.score]));
  const checklist_scores = template.checklist.map((item) => {
    const score = scoreMap.has(item.id) ? (scoreMap.get(item.id) as LeaderItemScore) : 2;
    return { item_id: item.id, score, item_text: item.item_text };
  });

  const score_total = checklist_scores.reduce((a, s) => a + s.score, 0);
  const score_max = checklist_scores.length * 2;

  let status = payload.status;
  if (checklist_scores.length > 0) {
    const derived = computeStatusFromScores(checklist_scores, status);
    const rank: Record<LeaderMonitorStatus, number> = {
      aman: 0,
      ada_catatan: 1,
      tidak_sesuai: 2,
    };
    status = rank[derived] >= rank[status] ? derived : status;
  }

  const needsNote = status !== "aman";
  const problem_note = (payload.problem_note || "").trim();
  const fix_instruction = (payload.fix_instruction || "").trim();

  if (needsNote && !problem_note) {
    return {
      success: false,
      error: "Catatan masalah wajib jika status Ada catatan / Tidak sesuai.",
    };
  }

  const photo = payload.photo_base64 || null;
  if (template.photo_mode === "required" && !photo) {
    return { success: false, error: "Foto bukti wajib untuk checklist ini." };
  }
  if (template.photo_mode === "required_if_issue" && needsNote && !photo) {
    return { success: false, error: "Foto wajib jika ada masalah." };
  }

  let follow_up: LeaderFollowUpStatus =
    payload.follow_up_status || (status === "aman" ? "selesai" : "open");
  if (status === "aman" && !payload.follow_up_status) follow_up = "selesai";

  const now = nowISO();
  const submission: LeaderMonitorSubmission = {
    id: uid("LMS"),
    template_id: template.id,
    kind: template.kind,
    report_date: payload.report_date || todayISO(),
    outlet_id: payload.outlet_id,
    shift: payload.shift || "Siang",
    leader_id: payload.leader_id || "LEADER",
    leader_name: payload.leader_name || "Leader",
    area: (payload.area || "").trim() || template.menu_label,
    status,
    score_total,
    score_max,
    checklist_scores,
    related_staff_ids: payload.related_staff_ids || [],
    related_staff_names: (payload.related_staff_names || "").trim(),
    problem_note,
    fix_instruction,
    fix_deadline: payload.fix_deadline || null,
    photo_url: photo,
    follow_up_status: follow_up,
    staff_submission_id: payload.staff_submission_id || null,
    staff_validation: payload.staff_validation || null,
    created_at: now,
    updated_at: now,
    title: template.title,
  };

  getState().submissions.push(submission);

  if (
    payload.staff_submission_id &&
    payload.staff_validation &&
    ["revisi", "tidak_valid", "manipulasi", "valid"].includes(payload.staff_validation)
  ) {
    await applyLeaderValidationDb({
      submission_id: payload.staff_submission_id,
      validation: payload.staff_validation,
      note: problem_note || fix_instruction,
      leader_id: submission.leader_id,
      leader_name: submission.leader_name,
      photo_base64: photo || undefined,
    });
  }

  return { success: true, data: submission };
}

export function updateLeaderMonitorFollowUp(
  id: string,
  follow_up_status: LeaderFollowUpStatus,
  extra?: { problem_note?: string; fix_instruction?: string },
): { success: true; data: LeaderMonitorSubmission } | { success: false; error: string } {
  const sub = getState().submissions.find((s) => s.id === id);
  if (!sub) return { success: false, error: "Laporan monitoring tidak ditemukan." };
  sub.follow_up_status = follow_up_status;
  if (extra?.problem_note !== undefined) sub.problem_note = extra.problem_note;
  if (extra?.fix_instruction !== undefined) sub.fix_instruction = extra.fix_instruction;
  sub.updated_at = nowISO();
  return { success: true, data: sub };
}

export function listLeaderMonitorSubmissions(
  filters: LeaderMonitorFilters = {},
): LeaderMonitorSubmission[] {
  const date = filters.date || todayISO();
  return getState()
    .submissions.filter((s) => s.report_date === date)
    .filter((s) => !filters.outlet || filters.outlet === "ALL" || s.outlet_id === filters.outlet)
    .filter((s) => !filters.kind || filters.kind === "ALL" || s.kind === filters.kind)
    .filter(
      (s) =>
        !filters.follow_up ||
        filters.follow_up === "ALL" ||
        s.follow_up_status === filters.follow_up,
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function buildLeaderMonitorDashboard(
  filters: LeaderMonitorFilters = {},
): Promise<LeaderMonitorDashboardData> {
  const date = filters.date || todayISO();
  const outlet = filters.outlet;
  const submissions = listLeaderMonitorSubmissions({ ...filters, date });
  const templates = listLeaderMonitorTemplates(outlet);

  // Prisma path may fail if daily SOP / leader_validation migration belum deploy.
  // Keep in-memory leader monitoring usable; staff_need_fix is optional enrichment.
  let staff_need_fix: DailyReportSubmission[] = [];
  try {
    staff_need_fix = (await listSubmissionsNeedingFix(date)).filter(
      (s) =>
        !outlet || outlet === "ALL" || s.outlet_id === outlet || s.outlet === outlet,
    );
  } catch (error) {
    console.error(
      "[buildLeaderMonitorDashboard] listSubmissionsNeedingFix failed",
      error,
    );
  }

  const summary: LeaderMonitorDashboardSummary = {
    total_today: submissions.length,
    area_aman: submissions.filter((s) => s.status === "aman").length,
    area_bermasalah: submissions.filter((s) => s.status !== "aman").length,
    staff_perlu_perbaikan: staff_need_fix.length,
    issue_open: submissions.filter(
      (s) =>
        (s.kind === "issue_log" || s.status !== "aman") &&
        (s.follow_up_status === "open" || s.follow_up_status === "on_progress"),
    ).length,
    issue_selesai: submissions.filter((s) => s.follow_up_status === "selesai").length,
    staff_revisi_count: staff_need_fix.length,
  };

  return { summary, templates, submissions, staff_need_fix };
}

export async function validateStaffReportFromLeader(
  payload: ValidateStaffReportPayload,
): Promise<
  { success: true; data: DailyReportSubmission } | { success: false; error: string }
> {
  return applyLeaderValidationDb(payload);
}

export async function getLeaderStaffOptions(outlet?: string) {
  const staff = await listStaff({ status: "ACTIVE", outlet: outlet === "ALL" ? undefined : outlet });
  return staff.map((s) => ({
    staff_id: s.staff_id,
    name: s.name,
    position: s.position,
    outlet: s.outlet,
  }));
}

export async function getStaffSubmissionForValidate(id: string) {
  return getSubmissionById(id);
}

export type { LeaderMonitorKind, StaffReportValidationStatus };

/**
 * Leader Monitoring — kontrol lapangan di atas Daily Report staff.
 * Templates + submissions persisted in PostgreSQL.
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
  LeaderMonitorChecklistItem,
  LeaderMonitorChecklistScore,
} from "@nusafood/types";
import type {
  LeaderMonitorTemplate as DbTemplate,
  LeaderMonitorSubmission as DbSubmission,
} from "@nusafood/database";
import {
  applyLeaderValidation as applyLeaderValidationDb,
  getSubmissionById,
  listSubmissionsNeedingFix,
} from "@/lib/services/daily-activity.service";
import { listStaff } from "@/lib/services/staff.service";
import {
  ensureLeaderMonitorTemplatesSeeded,
} from "@/lib/services/leader-monitoring-seed.service";
import {
  legacyTemplateIdForKind,
  LEADER_MONITOR_SEED_TEMPLATES,
} from "@/lib/leader-monitoring-seed-data";
import { dateKeyInAppTz, todayKeyInAppTz } from "@/lib/format-datetime";
import { prisma } from "@/lib/db";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function todayISO() {
  return todayKeyInAppTz();
}

function mapChecklist(raw: unknown): LeaderMonitorChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw as LeaderMonitorChecklistItem[];
}

function mapTemplate(row: DbTemplate): LeaderMonitorTemplate {
  return {
    id: legacyTemplateIdForKind(row.kind),
    kind: row.kind as LeaderMonitorKind,
    title: row.title,
    menu_label: row.menuLabel,
    description: row.description,
    standard_result: row.standardResult,
    outlet_id: row.outletCode,
    target_time_start: row.targetTimeStart,
    target_time_end: row.targetTimeEnd,
    photo_mode: row.photoMode,
    checklist: mapChecklist(row.checklist),
    active: row.active,
    sort_order: row.sortOrder,
  };
}

function mapSubmission(
  row: DbSubmission,
  templateTitle?: string,
): LeaderMonitorSubmission {
  return {
    id: row.id,
    template_id: legacyTemplateIdForKind(row.kind as LeaderMonitorKind),
    kind: row.kind as LeaderMonitorKind,
    report_date: dateKeyInAppTz(row.reportDate),
    outlet_id: row.outletCode,
    shift: row.shift,
    leader_id: row.leaderId,
    leader_name: row.leaderName,
    area: row.area,
    status: row.status as LeaderMonitorStatus,
    score_total: row.scoreTotal,
    score_max: row.scoreMax,
    checklist_scores:
      (row.checklistScores as unknown as LeaderMonitorChecklistScore[]) ?? [],
    related_staff_ids: (row.relatedStaffIds as unknown as string[]) ?? [],
    related_staff_names: row.relatedStaffNames,
    problem_note: row.problemNote,
    fix_instruction: row.fixInstruction,
    fix_deadline: row.fixDeadline,
    photo_url: row.photoUrl,
    follow_up_status: row.followUpStatus as LeaderFollowUpStatus,
    staff_submission_id: row.staffSubmissionId,
    staff_validation: row.staffValidation as StaffReportValidationStatus | null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    title: templateTitle,
  };
}

async function resolveDbTemplate(
  templateIdOrKind: string,
): Promise<DbTemplate | null> {
  await ensureLeaderMonitorTemplatesSeeded();

  if (UUID_RE.test(templateIdOrKind)) {
    const byUuid = await prisma.leaderMonitorTemplate.findUnique({
      where: { id: templateIdOrKind },
    });
    if (byUuid) return byUuid;
  }

  const seed = LEADER_MONITOR_SEED_TEMPLATES.find(
    (t) => t.id === templateIdOrKind,
  );
  if (seed) {
    return prisma.leaderMonitorTemplate.findFirst({
      where: { kind: seed.kind },
    });
  }

  return prisma.leaderMonitorTemplate.findFirst({
    where: { kind: templateIdOrKind as LeaderMonitorKind },
  });
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

function parseReportDate(value?: string): Date {
  const key = value?.trim() || todayISO();
  return new Date(`${key}T12:00:00+07:00`);
}

export async function listLeaderMonitorTemplates(
  outlet?: string,
): Promise<LeaderMonitorTemplate[]> {
  await ensureLeaderMonitorTemplatesSeeded();

  const rows = await prisma.leaderMonitorTemplate.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  return rows
    .map(mapTemplate)
    .filter(
      (t) =>
        !t.outlet_id ||
        !outlet ||
        outlet === "ALL" ||
        t.outlet_id === outlet,
    );
}

export async function getLeaderMonitorTemplate(
  idOrKind: string,
): Promise<LeaderMonitorTemplate | null> {
  const row = await resolveDbTemplate(idOrKind);
  return row ? mapTemplate(row) : null;
}

export async function submitLeaderMonitor(
  payload: SubmitLeaderMonitorPayload,
): Promise<
  { success: true; data: LeaderMonitorSubmission } | { success: false; error: string }
> {
  const templateRow = await resolveDbTemplate(payload.template_id);
  if (!templateRow || !templateRow.active) {
    return { success: false, error: "Template monitoring tidak ditemukan." };
  }

  const template = mapTemplate(templateRow);

  if (!payload.outlet_id) {
    return { success: false, error: "Outlet wajib diisi." };
  }

  const scoresInput = payload.checklist_scores || [];
  if (template.checklist.length > 0 && scoresInput.length === 0) {
    return { success: false, error: "Isi skor checklist (Aman / Catatan / Gagal)." };
  }

  const scoreMap = new Map(scoresInput.map((s) => [s.item_id, s.score]));
  const checklist_scores = template.checklist.map((item) => {
    const score = scoreMap.has(item.id)
      ? (scoreMap.get(item.id) as LeaderItemScore)
      : 2;
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

  const created = await prisma.leaderMonitorSubmission.create({
    data: {
      templateId: templateRow.id,
      kind: templateRow.kind,
      reportDate: parseReportDate(payload.report_date),
      outletCode: payload.outlet_id,
      shift: payload.shift || "Siang",
      leaderId: payload.leader_id || "LEADER",
      leaderName: payload.leader_name || "Leader",
      area: (payload.area || "").trim() || template.menu_label,
      status,
      scoreTotal: score_total,
      scoreMax: score_max,
      checklistScores: checklist_scores,
      relatedStaffIds: payload.related_staff_ids ?? [],
      relatedStaffNames: (payload.related_staff_names || "").trim(),
      problemNote: problem_note,
      fixInstruction: fix_instruction,
      fixDeadline: payload.fix_deadline || null,
      photoUrl: photo,
      followUpStatus: follow_up,
      staffSubmissionId: payload.staff_submission_id || null,
      staffValidation: payload.staff_validation || null,
    },
  });

  const submission = mapSubmission(created, template.title);

  if (
    payload.staff_submission_id &&
    payload.staff_validation &&
    ["revisi", "tidak_valid", "manipulasi", "valid"].includes(
      payload.staff_validation,
    )
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

export async function updateLeaderMonitorFollowUp(
  id: string,
  follow_up_status: LeaderFollowUpStatus,
  extra?: { problem_note?: string; fix_instruction?: string },
): Promise<
  { success: true; data: LeaderMonitorSubmission } | { success: false; error: string }
> {
  const existing = await prisma.leaderMonitorSubmission.findUnique({
    where: { id },
    include: { template: true },
  });
  if (!existing) {
    return { success: false, error: "Laporan monitoring tidak ditemukan." };
  }

  const updated = await prisma.leaderMonitorSubmission.update({
    where: { id },
    data: {
      followUpStatus: follow_up_status,
      ...(extra?.problem_note !== undefined
        ? { problemNote: extra.problem_note }
        : {}),
      ...(extra?.fix_instruction !== undefined
        ? { fixInstruction: extra.fix_instruction }
        : {}),
    },
    include: { template: true },
  });

  return {
    success: true,
    data: mapSubmission(updated, updated.template.title),
  };
}

export async function listLeaderMonitorSubmissions(
  filters: LeaderMonitorFilters = {},
): Promise<LeaderMonitorSubmission[]> {
  const dateKey = filters.date || todayISO();
  const reportDate = parseReportDate(dateKey);

  const rows = await prisma.leaderMonitorSubmission.findMany({
    where: {
      reportDate,
      ...(filters.outlet && filters.outlet !== "ALL"
        ? { outletCode: filters.outlet }
        : {}),
      ...(filters.kind && filters.kind !== "ALL"
        ? { kind: filters.kind }
        : {}),
      ...(filters.follow_up && filters.follow_up !== "ALL"
        ? { followUpStatus: filters.follow_up }
        : {}),
    },
    include: { template: true },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => mapSubmission(row, row.template.title));
}

export async function buildLeaderMonitorDashboard(
  filters: LeaderMonitorFilters = {},
): Promise<LeaderMonitorDashboardData> {
  const date = filters.date || todayISO();
  const outlet = filters.outlet;
  const [submissions, templates] = await Promise.all([
    listLeaderMonitorSubmissions({ ...filters, date }),
    listLeaderMonitorTemplates(outlet),
  ]);

  let staff_need_fix: DailyReportSubmission[] = [];
  try {
    staff_need_fix = (await listSubmissionsNeedingFix(date)).filter(
      (s) =>
        !outlet ||
        outlet === "ALL" ||
        s.outlet_id === outlet ||
        s.outlet === outlet,
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
    issue_selesai: submissions.filter((s) => s.follow_up_status === "selesai")
      .length,
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
  const staff = await listStaff({
    status: "ACTIVE",
    outlet: outlet === "ALL" ? undefined : outlet,
  });
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

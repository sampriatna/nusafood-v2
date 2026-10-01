/**
 * Logika Project yang murni (tanpa DB) supaya satu sumber kebenaran untuk server & UI:
 * progress (hanya DONE), readiness/publish gate, syarat submit, health, fokus, akses PIC.
 */
import type { MilestoneStatus, ProjectHealth, ProjectStatus } from "@/lib/project-types";

export const LOCKED_MILESTONE_STATUSES: MilestoneStatus[] = ["WAITING_VALIDATION", "DONE"];

export function isStructureLocked(status: string): boolean {
  return LOCKED_MILESTONE_STATUSES.includes(status as MilestoneStatus);
}

/* ─── Progress ─── */

type Weighted = { weight: number };

function w(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

/** Progress workstream: bobot milestone DONE / total bobot. WAITING/REVISION/IN_PROGRESS tidak dihitung. */
export function calcWorkstreamProgress(
  milestones: (Weighted & { status: string })[],
): number {
  if (!milestones.length) return 0;
  const total = milestones.reduce((sum, m) => sum + w(m.weight), 0);
  const done = milestones
    .filter((m) => m.status === "DONE")
    .reduce((sum, m) => sum + w(m.weight), 0);
  return Math.round((done / total) * 100);
}

/** Progress project: rata-rata berbobot progress workstream (bukan jumlah checklist). */
export function calcProjectProgress(
  workstreams: (Weighted & { progress: number })[],
): number {
  if (!workstreams.length) return 0;
  const total = workstreams.reduce((sum, x) => sum + w(x.weight), 0);
  const weighted = workstreams.reduce((sum, x) => sum + x.progress * w(x.weight), 0);
  return Math.round(weighted / total);
}

/**
 * Peringatan bobot: hanya bila owner memakai bobot khusus (ada yang bukan 1) dan total bukan 100.
 * Bobot default (semua 1) = equal weighting dan tidak memicu peringatan.
 */
export function weightWarning(items: Weighted[]): { custom: boolean; total: number; warn: boolean } {
  const custom = items.some((i) => w(i.weight) !== 1);
  const total = items.reduce((sum, i) => sum + w(i.weight), 0);
  return { custom, total, warn: custom && total !== 100 };
}

/* ─── Readiness / publish gate ─── */

export type ReadinessCode =
  | "PIC_REQUIRED"
  | "WORKSTREAM_REQUIRED"
  | "MILESTONE_REQUIRED"
  | "CHECKLIST_REQUIRED";

export type ReadinessInput = {
  leadStaffId: string | null;
  workstreams: {
    name: string;
    milestones: { title: string; stepCount: number }[];
  }[];
};

export type Readiness = {
  ready: boolean;
  missing: ReadinessCode[];
  /** Detail yang spesifik, mis. "Milestone 'Packing' belum punya checklist". */
  details: string[];
};

export function getProjectReadiness(input: ReadinessInput): Readiness {
  const missing: ReadinessCode[] = [];
  const details: string[] = [];
  if (!input.leadStaffId) {
    missing.push("PIC_REQUIRED");
    details.push("Pilih PIC utama project");
  }
  if (!input.workstreams.length) {
    missing.push("WORKSTREAM_REQUIRED");
    details.push("Tambahkan minimal 1 bagian kerja (workstream)");
  } else {
    const noMilestone = input.workstreams.filter((x) => !x.milestones.length);
    if (noMilestone.length) {
      missing.push("MILESTONE_REQUIRED");
      for (const x of noMilestone) details.push(`Bagian "${x.name}" belum punya milestone`);
    }
    const noSteps = input.workstreams.flatMap((x) =>
      x.milestones.filter((m) => m.stepCount < 1).map((m) => `${x.name} › ${m.title}`),
    );
    if (noSteps.length) {
      missing.push("CHECKLIST_REQUIRED");
      for (const label of noSteps) details.push(`Milestone "${label}" belum punya checklist langkah`);
    }
  }
  return { ready: missing.length === 0, missing, details };
}

export const READINESS_LABEL: Record<ReadinessCode, string> = {
  PIC_REQUIRED: "Pilih PIC utama",
  WORKSTREAM_REQUIRED: "Tambahkan bagian kerja",
  MILESTONE_REQUIRED: "Tambahkan milestone",
  CHECKLIST_REQUIRED: "Tambahkan checklist langkah",
};

export type SetupStatus = "DRAFT" | "READY" | "PUBLISHED";

export function setupStatusOf(publishedAt: string | Date | null, readiness: Readiness): SetupStatus {
  if (publishedAt) return "PUBLISHED";
  return readiness.ready ? "READY" : "DRAFT";
}

/* ─── Submit milestone ─── */

export type StepState = {
  is_required: boolean;
  requires_evidence: boolean;
  is_checked: boolean;
  evidence_url: string | null;
};

export type SubmitCheck = {
  canSubmit: boolean;
  missingRequired: number;
  missingEvidence: number;
  noSteps: boolean;
  reasons: string[];
};

export function checkMilestoneSubmit(steps: StepState[]): SubmitCheck {
  const noSteps = steps.length === 0;
  const missingRequired = steps.filter((s) => s.is_required && !s.is_checked).length;
  // Bukti hanya dituntut dari langkah yang dianggap dikerjakan (wajib, atau opsional yang dicentang).
  const missingEvidence = steps.filter(
    (s) => s.requires_evidence && !s.evidence_url && (s.is_required || s.is_checked),
  ).length;
  const reasons: string[] = [];
  if (noSteps) reasons.push("Milestone belum punya checklist langkah.");
  if (missingRequired) reasons.push(`Masih ada ${missingRequired} langkah wajib yang belum selesai.`);
  if (missingEvidence) reasons.push(`Masih ada ${missingEvidence} bukti wajib yang belum diupload.`);
  return {
    canSubmit: !noSteps && !missingRequired && !missingEvidence,
    missingRequired,
    missingEvidence,
    noSteps,
    reasons,
  };
}

/** Status milestone yang boleh diajukan: bukan menunggu/selesai. */
export function canSubmitFromStatus(status: string): boolean {
  return status === "NOT_STARTED" || status === "IN_PROGRESS" || status === "REVISION";
}

/* ─── Akses PIC ─── */

export type PicScope =
  | { kind: "ALL" }
  | { kind: "OWN"; workstreamIds: string[] }
  | { kind: "NONE" };

/** PIC utama melihat semua workstream; PIC workstream hanya miliknya. */
export function picScope(
  leadStaffId: string | null,
  workstreams: { id: string; ownerStaffId: string | null }[],
  staffId: string,
): PicScope {
  if (leadStaffId && leadStaffId === staffId) return { kind: "ALL" };
  const own = workstreams.filter((x) => x.ownerStaffId === staffId).map((x) => x.id);
  return own.length ? { kind: "OWN", workstreamIds: own } : { kind: "NONE" };
}

/** Boleh mengerjakan milestone di workstream tertentu? (PIC utama boleh seluruhnya.) */
export function canWorkOnWorkstream(scope: PicScope, workstreamId: string): boolean {
  if (scope.kind === "ALL") return true;
  if (scope.kind === "OWN") return scope.workstreamIds.includes(workstreamId);
  return false;
}

/* ─── Deadline & Health ─── */

function daysBetween(fromKey: string, toKey: string): number {
  const a = Date.parse(`${fromKey}T00:00:00Z`);
  const b = Date.parse(`${toKey}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export type DeadlineState = "none" | "ok" | "soon" | "overdue";

export function deadlineState(deadline: string | null, todayKey: string, done = false): DeadlineState {
  if (!deadline || done) return "none";
  const left = daysBetween(todayKey, deadline);
  if (left < 0) return "overdue";
  if (left <= 3) return "soon";
  return "ok";
}

export type HealthInput = {
  status: ProjectStatus;
  progress: number;
  deadline: string | null;
  todayKey: string;
  activeBlockers: number;
  milestones: { status: string; deadline: string | null }[];
  /** Hari sejak aktivitas terakhir; null bila belum ada. */
  idleDays: number | null;
  override?: ProjectHealth | null;
};

export function deriveHealth(input: HealthInput): ProjectHealth {
  if (input.override) return input.override;
  const allDone =
    input.milestones.length > 0 && input.milestones.every((m) => m.status === "DONE");
  if (input.status === "COMPLETED" || allDone) return "COMPLETED";
  if (input.activeBlockers > 0 || input.milestones.some((m) => m.status === "BLOCKED")) return "BLOCKED";
  const open = input.milestones.filter((m) => m.status !== "DONE");
  const attention =
    deadlineState(input.deadline, input.todayKey, false) === "overdue" ||
    open.some((m) => {
      const state = deadlineState(m.deadline, input.todayKey);
      return state === "overdue" || state === "soon";
    }) ||
    (input.idleDays !== null && input.idleDays >= 7 && input.progress < 100);
  return attention ? "NEED_ATTENTION" : "ON_TRACK";
}

/* ─── Fokus sekarang ─── */

export type FocusMilestone = {
  id: string;
  title: string;
  status: string;
  steps: { id: string; item_text: string; is_required: boolean; is_checked: boolean }[];
};

export type Focus = {
  milestone_id: string;
  milestone_title: string;
  step_id: string | null;
  step_text: string | null;
  status: string;
};

/** Milestone aktif → langkah wajib pertama yang belum dicentang. Menunggu validasi/selesai dilewati. */
export function computeFocus(milestones: FocusMilestone[]): Focus | null {
  const pick =
    milestones.find((m) => m.status === "REVISION") ||
    milestones.find((m) => m.status === "IN_PROGRESS") ||
    milestones.find((m) => m.status === "NOT_STARTED" || m.status === "BLOCKED");
  if (!pick) return null;
  const step =
    pick.steps.find((s) => s.is_required && !s.is_checked) ||
    pick.steps.find((s) => !s.is_checked) ||
    null;
  return {
    milestone_id: pick.id,
    milestone_title: pick.title,
    step_id: step?.id ?? null,
    step_text: step?.item_text ?? null,
    status: pick.status,
  };
}

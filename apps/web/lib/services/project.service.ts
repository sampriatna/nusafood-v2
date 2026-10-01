import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { todayKeyInAppTz } from "@/lib/format-datetime";
import { ProjectError } from "@/lib/project-errors";
import {
  calcProjectProgress,
  calcWorkstreamProgress,
  computeFocus,
  deadlineState,
  deriveHealth,
  getProjectReadiness,
  isStructureLocked,
  setupStatusOf,
  weightWarning,
} from "@/lib/project-logic";
import type {
  MilestoneStatus,
  ProjectBlockerDto,
  ProjectDetailDto,
  ProjectHealth,
  ProjectMilestoneDto,
  ProjectMilestoneReviewDto,
  ProjectMilestoneStepDto,
  ProjectPendingValidationDto,
  ProjectPicWorkloadDto,
  ProjectStaffOption,
  ProjectStatus,
  ProjectSummaryDto,
  ProjectWorkstreamDto,
} from "@/lib/project-types";
import {
  activityData,
  listActivity,
  type Actor,
} from "@/lib/services/project-activity.service";

const OWNER_ACTOR = (name?: string | null, id?: string | null): Actor => ({
  type: "OWNER",
  name: name || "Owner",
  id: id || null,
});
export { OWNER_ACTOR };

/* ─── helpers ─── */

function dateOnly(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}
function dateTime(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}
function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "project";
}
function clampWeight(value: unknown): number {
  const n = Math.round(Number(value || 1));
  return Math.max(1, Math.min(100, Number.isFinite(n) ? n : 1));
}

export function stepDto(row: {
  id: string;
  milestoneId: string;
  itemText: string;
  isRequired: boolean;
  requiresEvidence: boolean;
  isChecked: boolean;
  note: string | null;
  evidenceUrl: string | null;
  completedByStaffId: string | null;
  completedAt: Date | null;
  sortOrder: number;
}): ProjectMilestoneStepDto {
  return {
    id: row.id,
    milestone_id: row.milestoneId,
    item_text: row.itemText,
    is_required: row.isRequired,
    requires_evidence: row.requiresEvidence,
    is_checked: row.isChecked,
    note: row.note || "",
    evidence_url: row.evidenceUrl,
    completed_by_staff_id: row.completedByStaffId,
    completed_at: dateTime(row.completedAt),
    sort_order: row.sortOrder,
  };
}

function reviewDto(row: {
  id: string;
  milestoneId: string;
  submittedByStaffId: string;
  submittedByName: string;
  submittedAt: Date;
  status: string;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  snapshot: unknown;
}): ProjectMilestoneReviewDto {
  return {
    id: row.id,
    milestone_id: row.milestoneId,
    submitted_by_staff_id: row.submittedByStaffId,
    submitted_by_name: row.submittedByName,
    submitted_at: row.submittedAt.toISOString(),
    status: row.status as ProjectMilestoneReviewDto["status"],
    reviewed_by: row.reviewedBy,
    reviewed_by_name: row.reviewedByName,
    reviewed_at: dateTime(row.reviewedAt),
    review_note: row.reviewNote || "",
    snapshot: Array.isArray(row.snapshot)
      ? (row.snapshot as ProjectMilestoneReviewDto["snapshot"])
      : [],
  };
}

/** Kunci baris milestone dalam transaksi: mencegah dua aksi (PIC/owner) menimpa satu sama lain. */
export async function lockMilestone(
  tx: Prisma.TransactionClient,
  milestoneId: string,
): Promise<{ id: string; workstreamId: string; title: string; status: string }> {
  await tx.$queryRaw`SELECT "id" FROM "prj_milestones" WHERE "id" = CAST(${milestoneId} AS UUID) FOR UPDATE`;
  const row = await tx.projectMilestone.findUnique({
    where: { id: milestoneId },
    select: { id: true, workstreamId: true, title: true, status: true },
  });
  if (!row) throw new ProjectError("Milestone tidak ditemukan", "MILESTONE_NOT_FOUND", 404);
  return row;
}

async function assertActiveStaff(staffId?: string | null): Promise<string | null> {
  if (!staffId) return null;
  const staff = await prisma.staff.findUnique({
    where: { staffId },
    select: { name: true, status: true },
  });
  if (!staff || staff.status !== "ACTIVE") {
    throw new ProjectError("PIC harus dipilih dari staff aktif", "PIC_NOT_ACTIVE", 422);
  }
  return staff.name;
}

/* ─── read model ─── */

async function buildProjects(projectIds?: string[]): Promise<ProjectDetailDto[]> {
  const projects = await prisma.project.findMany({
    where: projectIds ? { id: { in: projectIds } } : undefined,
    orderBy: { updatedAt: "desc" },
  });
  if (!projects.length) return [];

  const ids = projects.map((p) => p.id);
  const workstreams = await prisma.projectWorkstream.findMany({
    where: { projectId: { in: ids } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const workstreamIds = workstreams.map((row) => row.id);
  const milestones = workstreamIds.length
    ? await prisma.projectMilestone.findMany({
        where: { workstreamId: { in: workstreamIds } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      })
    : [];
  const milestoneIds = milestones.map((row) => row.id);
  const [steps, reviews, blockers, lastActivity] = await Promise.all([
    milestoneIds.length
      ? prisma.projectMilestoneStep.findMany({
          where: { milestoneId: { in: milestoneIds } },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        })
      : [],
    milestoneIds.length
      ? prisma.projectMilestoneReview.findMany({
          where: { milestoneId: { in: milestoneIds } },
          orderBy: { submittedAt: "desc" },
        })
      : [],
    prisma.projectBlocker.findMany({
      where: { projectId: { in: ids }, resolvedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    prisma.projectActivity.groupBy({
      by: ["projectId"],
      where: { projectId: { in: ids } },
      _max: { createdAt: true },
    }),
  ]);

  const today = todayKeyInAppTz();
  const stepsByMilestone = new Map<string, ProjectMilestoneStepDto[]>();
  for (const row of steps) {
    const list = stepsByMilestone.get(row.milestoneId) ?? [];
    list.push(stepDto(row));
    stepsByMilestone.set(row.milestoneId, list);
  }
  const reviewsByMilestone = new Map<string, ProjectMilestoneReviewDto[]>();
  for (const row of reviews) {
    const list = reviewsByMilestone.get(row.milestoneId) ?? [];
    list.push(reviewDto(row));
    reviewsByMilestone.set(row.milestoneId, list);
  }
  const blockersByMilestone = new Map<string, number>();
  for (const b of blockers) {
    if (b.milestoneId) {
      blockersByMilestone.set(b.milestoneId, (blockersByMilestone.get(b.milestoneId) ?? 0) + 1);
    }
  }

  const milestoneDtos: ProjectMilestoneDto[] = milestones.map((row) => {
    const own = reviewsByMilestone.get(row.id) ?? [];
    return {
      id: row.id,
      workstream_id: row.workstreamId,
      title: row.title,
      description: row.description || "",
      weight: row.weight,
      status: row.status as MilestoneStatus,
      deadline: dateOnly(row.deadline),
      evidence_url: row.evidenceUrl,
      completed_at: dateTime(row.completedAt),
      sort_order: row.sortOrder,
      steps: stepsByMilestone.get(row.id) ?? [],
      latest_review: own[0] ?? null,
      reviews: own,
      active_blockers: blockersByMilestone.get(row.id) ?? 0,
    };
  });

  const workstreamDtos: ProjectWorkstreamDto[] = workstreams.map((row) => {
    const own = milestoneDtos.filter((m) => m.workstream_id === row.id);
    return {
      id: row.id,
      project_id: row.projectId,
      name: row.name,
      owner_staff_id: row.ownerStaffId,
      owner_name: row.ownerName,
      weight: row.weight,
      status: row.status as ProjectStatus,
      health: row.health as ProjectHealth,
      next_action: row.nextAction,
      blocker: row.blocker,
      deadline: dateOnly(row.deadline),
      sort_order: row.sortOrder,
      progress: calcWorkstreamProgress(own),
      milestones: own,
    };
  });

  const nameById = new Map<string, string>();
  for (const w of workstreams) nameById.set(w.id, w.name);
  const milestoneTitle = new Map(milestones.map((m) => [m.id, m.title]));

  return projects.map((row): ProjectDetailDto => {
    const own = workstreamDtos.filter((w) => w.project_id === row.id);
    const allMilestones = own.flatMap((w) => w.milestones);
    const projectBlockers: ProjectBlockerDto[] = blockers
      .filter((b) => b.projectId === row.id)
      .map((b) => ({
        id: b.id,
        project_id: b.projectId,
        workstream_id: b.workstreamId,
        milestone_id: b.milestoneId,
        milestone_title: b.milestoneId ? milestoneTitle.get(b.milestoneId) ?? null : null,
        workstream_name: b.workstreamId ? nameById.get(b.workstreamId) ?? null : null,
        reported_by_name: b.reportedByName,
        text: b.text,
        created_at: b.createdAt.toISOString(),
      }));

    const readiness = getProjectReadiness({
      leadStaffId: row.leadStaffId,
      workstreams: own.map((w) => ({
        name: w.name,
        milestones: w.milestones.map((m) => ({ title: m.title, stepCount: m.steps.length })),
      })),
    });
    const progress = calcProjectProgress(own);
    const last = lastActivity.find((a) => a.projectId === row.id)?._max.createdAt ?? null;
    const idleDays = last
      ? Math.floor((Date.now() - last.getTime()) / 86_400_000)
      : null;
    const override = (row.healthOverride as ProjectHealth | null) || null;
    const healthDerived = deriveHealth({
      status: row.status as ProjectStatus,
      progress,
      deadline: dateOnly(row.deadline),
      todayKey: today,
      activeBlockers: projectBlockers.length,
      milestones: allMilestones.map((m) => ({ status: m.status, deadline: m.deadline })),
      idleDays: row.publishedAt ? idleDays : null,
      override,
    });

    const focus = computeFocus(allMilestones);
    const picNames = [
      ...new Set(
        [row.leadName, ...own.map((w) => w.owner_name)].filter((n): n is string => Boolean(n)),
      ),
    ];
    const overdue = allMilestones.filter(
      (m) => deadlineState(m.deadline, today, m.status === "DONE") === "overdue",
    ).length;

    return {
      id: row.id,
      project_key: row.projectKey,
      name: row.name,
      goal: row.goal,
      lead_staff_id: row.leadStaffId,
      lead_name: row.leadName,
      status: row.status as ProjectStatus,
      health: healthDerived,
      health_derived: healthDerived,
      health_override: override,
      start_date: dateOnly(row.startDate),
      deadline: dateOnly(row.deadline),
      next_action: row.nextAction,
      blocker: row.blocker,
      progress,
      workstream_count: own.length,
      created_by: row.createdBy,
      setup_status: setupStatusOf(row.publishedAt, readiness),
      published_at: dateTime(row.publishedAt),
      milestone_total: allMilestones.length,
      milestone_done: allMilestones.filter((m) => m.status === "DONE").length,
      waiting_validation: allMilestones.filter((m) => m.status === "WAITING_VALIDATION").length,
      revision: allMilestones.filter((m) => m.status === "REVISION").length,
      active_blockers: projectBlockers.length,
      overdue,
      pic_names: picNames,
      focus_text:
        row.nextAction ||
        (focus ? focus.step_text || focus.milestone_title : null),
      workstreams: own,
      readiness,
      blockers: projectBlockers,
      activity: [],
      weight_warning:
        weightWarning(own).warn || own.some((w) => weightWarning(w.milestones).warn),
    };
  });
}

export async function listProjectStaffOptions(): Promise<ProjectStaffOption[]> {
  const staff = await prisma.staff.findMany({
    where: { status: "ACTIVE" },
    select: { staffId: true, name: true, position: true },
    orderBy: { name: "asc" },
  });
  return staff.map((row) => ({
    staff_id: row.staffId,
    name: row.name,
    position: row.position || "",
  }));
}

export async function listProjects(): Promise<ProjectSummaryDto[]> {
  const projects = await buildProjects();
  return projects.map((p) => {
    const { workstreams, readiness, blockers, activity, weight_warning, ...summary } = p;
    void workstreams; void readiness; void blockers; void activity; void weight_warning;
    return summary;
  });
}

export async function getProject(projectId: string): Promise<ProjectDetailDto | null> {
  const [project] = await buildProjects([projectId]);
  if (!project) return null;
  project.activity = await listActivity(projectId);
  return project;
}

/** Antrian validasi lintas project, terlama dulu. */
export async function listPendingValidations(): Promise<ProjectPendingValidationDto[]> {
  const projects = await buildProjects();
  const rows: ProjectPendingValidationDto[] = [];
  for (const project of projects) {
    if (project.status === "CANCELLED") continue;
    for (const ws of project.workstreams) {
      for (const m of ws.milestones) {
        if (m.status !== "WAITING_VALIDATION") continue;
        const pending = m.reviews.find((r) => r.status === "PENDING");
        if (!pending) continue;
        rows.push({
          project_id: project.id,
          project_name: project.name,
          workstream_id: ws.id,
          workstream_name: ws.name,
          milestone_id: m.id,
          milestone_title: m.title,
          pic_name: pending.submitted_by_name,
          submitted_at: pending.submitted_at,
          steps_done: m.steps.filter((s) => s.is_checked).length,
          steps_total: m.steps.length,
          evidence_count: m.steps.filter((s) => s.evidence_url).length,
          deadline: m.deadline,
        });
      }
    }
  }
  return rows.sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));
}

/** Konteks kerja per PIC (klik nama PIC). */
export async function getPicWorkload(staffId: string): Promise<ProjectPicWorkloadDto | null> {
  const staff = await prisma.staff.findUnique({
    where: { staffId },
    select: { staffId: true, name: true },
  });
  if (!staff) return null;
  const today = todayKeyInAppTz();
  const projects = await buildProjects();
  const result: ProjectPicWorkloadDto = { staff_id: staff.staffId, name: staff.name, projects: [] };
  for (const project of projects) {
    if (project.status === "CANCELLED") continue;
    const own = project.workstreams.filter((w) => w.owner_staff_id === staffId);
    const isLead = project.lead_staff_id === staffId;
    if (!isLead && !own.length) continue;
    const scope = isLead ? project.workstreams : own;
    const ms = scope.flatMap((w) => w.milestones);
    result.projects.push({
      project_id: project.id,
      project_name: project.name,
      role: isLead ? "PIC_UTAMA" : "BAGIAN",
      workstream_names: own.map((w) => w.name),
      progress: isLead ? project.progress : calcProjectProgress(own),
      waiting_validation: ms.filter((m) => m.status === "WAITING_VALIDATION").length,
      overdue: ms.filter((m) => deadlineState(m.deadline, today, m.status === "DONE") === "overdue").length,
    });
  }
  return result;
}

/* ─── project (owner) ─── */

export async function createProject(
  input: {
    name: string;
    goal?: string | null;
    lead_staff_id?: string | null;
    start_date?: string | null;
    deadline?: string | null;
    created_by?: string | null;
  },
  actor: Actor,
): Promise<ProjectDetailDto> {
  const leadName = await assertActiveStaff(input.lead_staff_id);
  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        projectKey: `${slugify(input.name)}-${randomUUID().slice(0, 6)}`,
        name: input.name.trim(),
        goal: input.goal?.trim() || null,
        leadStaffId: input.lead_staff_id || null,
        leadName,
        startDate: parseDate(input.start_date),
        deadline: parseDate(input.deadline),
        createdBy: input.created_by || actor.name || null,
      },
    });
    await tx.projectActivity.create({
      data: activityData({
        projectId: created.id,
        action: "PROJECT_CREATED",
        actor,
        message: `Project “${created.name}” dibuat${leadName ? `, PIC utama ${leadName}` : ""}.`,
      }),
    });
    return created;
  });
  const project = await getProject(row.id);
  if (!project) throw new ProjectError("Project gagal dibuat", "CREATE_FAILED", 500);
  return project;
}

export type ProjectPatch = Partial<{
  name: string;
  goal: string | null;
  lead_staff_id: string | null;
  status: ProjectStatus;
  health_override: ProjectHealth | null;
  start_date: string | null;
  deadline: string | null;
  /** Pinned next action (override fokus otomatis). */
  next_action: string | null;
  blocker: string | null;
}>;

export async function updateProject(
  projectId: string,
  patch: ProjectPatch,
  actor: Actor,
): Promise<ProjectDetailDto | null> {
  const current = await prisma.project.findUnique({ where: { id: projectId } });
  if (!current) return null;
  const events: string[] = [];
  const data: Prisma.ProjectUncheckedUpdateInput = {};
  let revokeCandidates: string[] = [];

  if (patch.name !== undefined) {
    if (!patch.name.trim()) throw new ProjectError("Nama project wajib diisi", "NAME_REQUIRED", 422);
    data.name = patch.name.trim();
  }
  if (patch.goal !== undefined) data.goal = patch.goal?.trim() || null;
  if (patch.lead_staff_id !== undefined && patch.lead_staff_id !== current.leadStaffId) {
    const name = await assertActiveStaff(patch.lead_staff_id);
    data.leadStaffId = patch.lead_staff_id || null;
    data.leadName = name;
    events.push(
      `PIC utama diganti: ${current.leadName || "belum ada"} → ${name || "belum ada"}.`,
    );
    if (current.leadStaffId) revokeCandidates = [current.leadStaffId];
  }
  if (patch.status !== undefined) {
    data.status = patch.status;
    if (patch.status !== current.status) events.push(`Status project menjadi ${patch.status}.`);
  }
  if (patch.health_override !== undefined) data.healthOverride = patch.health_override;
  if (patch.start_date !== undefined) data.startDate = parseDate(patch.start_date);
  if (patch.deadline !== undefined) {
    data.deadline = parseDate(patch.deadline);
    if ((patch.deadline || null) !== dateOnly(current.deadline)) {
      events.push(`Deadline project diubah ke ${patch.deadline || "tanpa deadline"}.`);
    }
  }
  if (patch.next_action !== undefined) data.nextAction = patch.next_action?.trim() || null;
  if (patch.blocker !== undefined) data.blocker = patch.blocker?.trim() || null;

  await prisma.$transaction([
    prisma.project.update({ where: { id: projectId }, data }),
    ...events.map((message) =>
      prisma.projectActivity.create({
        data: activityData({
          projectId,
          action: message.startsWith("PIC utama")
            ? "PIC_CHANGED"
            : message.startsWith("Deadline")
              ? "DEADLINE_CHANGED"
              : "PROJECT_UPDATED",
          actor,
          message,
        }),
      }),
    ),
  ]);

  // PIC lama yang tidak memegang peran lagi: link-nya dinonaktifkan (riwayat tetap).
  for (const staffId of revokeCandidates) await revokeLinkIfNoRole(projectId, staffId, actor);
  return getProject(projectId);
}

async function revokeLinkIfNoRole(projectId: string, staffId: string, actor: Actor) {
  const [project, owned] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { leadStaffId: true } }),
    prisma.projectWorkstream.count({ where: { projectId, ownerStaffId: staffId } }),
  ]);
  if (!project || project.leadStaffId === staffId || owned > 0) return;
  const link = await prisma.projectPicLink.findUnique({
    where: { projectId_staffId: { projectId, staffId } },
  });
  if (!link || !link.isActive) return;
  await prisma.$transaction([
    prisma.projectPicLink.update({
      where: { id: link.id },
      data: { isActive: false, revokedAt: new Date() },
    }),
    prisma.projectActivity.create({
      data: activityData({
        projectId,
        action: "LINK_REVOKED",
        actor,
        message: "Link PIC lama dinonaktifkan otomatis karena PIC diganti.",
      }),
    }),
  ]);
}

/* ─── workstream ─── */

export async function createWorkstream(
  projectId: string,
  input: {
    name: string;
    owner_staff_id?: string | null;
    weight?: number;
    deadline?: string | null;
  },
  actor: Actor,
): Promise<void> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new ProjectError("Project tidak ditemukan", "PROJECT_NOT_FOUND", 404);
  const ownerName = await assertActiveStaff(input.owner_staff_id);
  const last = await prisma.projectWorkstream.findFirst({
    where: { projectId },
    orderBy: { sortOrder: "desc" },
  });
  try {
    await prisma.$transaction(async (tx) => {
      const ws = await tx.projectWorkstream.create({
        data: {
          projectId,
          name: input.name.trim(),
          ownerStaffId: input.owner_staff_id || null,
          ownerName,
          weight: clampWeight(input.weight),
          deadline: parseDate(input.deadline),
          sortOrder: (last?.sortOrder || 0) + 10,
        },
      });
      await tx.projectActivity.create({
        data: activityData({
          projectId,
          workstreamId: ws.id,
          action: "WORKSTREAM_CREATED",
          actor,
          message: `Bagian “${ws.name}” ditambahkan${ownerName ? ` (PIC ${ownerName})` : ""}.`,
        }),
      });
    });
  } catch (error) {
    if (typeof error === "object" && error && (error as { code?: string }).code === "P2002") {
      throw new ProjectError("Nama bagian sudah dipakai di project ini", "DUPLICATE_WORKSTREAM", 409);
    }
    throw error;
  }
}

/** Mode sederhana: satu PIC mengerjakan seluruh project → bagian "Eksekusi Utama" milik PIC utama. */
export async function createSimpleWorkstream(projectId: string, actor: Actor): Promise<void> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new ProjectError("Project tidak ditemukan", "PROJECT_NOT_FOUND", 404);
  if (!project.leadStaffId) {
    throw new ProjectError("Pilih PIC utama dulu", "PIC_REQUIRED", 422);
  }
  const existing = await prisma.projectWorkstream.count({ where: { projectId } });
  if (existing) {
    throw new ProjectError("Project sudah punya bagian kerja", "WORKSTREAM_EXISTS", 409);
  }
  await createWorkstream(
    projectId,
    { name: "Eksekusi Utama", owner_staff_id: project.leadStaffId },
    actor,
  );
}

export async function updateWorkstream(
  workstreamId: string,
  patch: Partial<{
    name: string;
    owner_staff_id: string | null;
    weight: number;
    deadline: string | null;
    next_action: string | null;
  }>,
  actor: Actor,
): Promise<void> {
  const current = await prisma.projectWorkstream.findUnique({ where: { id: workstreamId } });
  if (!current) throw new ProjectError("Bagian tidak ditemukan", "WORKSTREAM_NOT_FOUND", 404);
  const data: Prisma.ProjectWorkstreamUncheckedUpdateInput = {};
  const events: { action: string; message: string }[] = [];
  let oldOwner: string | null = null;

  if (patch.name !== undefined) {
    if (!patch.name.trim()) throw new ProjectError("Nama bagian wajib diisi", "NAME_REQUIRED", 422);
    data.name = patch.name.trim();
  }
  if (patch.owner_staff_id !== undefined && patch.owner_staff_id !== current.ownerStaffId) {
    const name = await assertActiveStaff(patch.owner_staff_id);
    data.ownerStaffId = patch.owner_staff_id || null;
    data.ownerName = name;
    oldOwner = current.ownerStaffId;
    events.push({
      action: "PIC_CHANGED",
      message: `PIC bagian “${current.name}” diganti: ${current.ownerName || "belum ada"} → ${name || "belum ada"}.`,
    });
  }
  if (patch.weight !== undefined) data.weight = clampWeight(patch.weight);
  if (patch.deadline !== undefined) {
    data.deadline = parseDate(patch.deadline);
    if ((patch.deadline || null) !== dateOnly(current.deadline)) {
      events.push({
        action: "DEADLINE_CHANGED",
        message: `Deadline bagian “${current.name}” diubah ke ${patch.deadline || "tanpa deadline"}.`,
      });
    }
  }
  if (patch.next_action !== undefined) data.nextAction = patch.next_action?.trim() || null;

  try {
    await prisma.$transaction([
      prisma.projectWorkstream.update({ where: { id: workstreamId }, data }),
      ...events.map((e) =>
        prisma.projectActivity.create({
          data: activityData({
            projectId: current.projectId,
            workstreamId,
            action: e.action,
            actor,
            message: e.message,
          }),
        }),
      ),
    ]);
  } catch (error) {
    if (typeof error === "object" && error && (error as { code?: string }).code === "P2002") {
      throw new ProjectError("Nama bagian sudah dipakai di project ini", "DUPLICATE_WORKSTREAM", 409);
    }
    throw error;
  }
  if (oldOwner) await revokeLinkIfNoRole(current.projectId, oldOwner, actor);
}

async function milestoneHasHistory(milestoneIds: string[]): Promise<boolean> {
  if (!milestoneIds.length) return false;
  const [reviews, done] = await Promise.all([
    prisma.projectMilestoneReview.count({ where: { milestoneId: { in: milestoneIds } } }),
    prisma.projectMilestone.count({ where: { id: { in: milestoneIds }, status: { not: "NOT_STARTED" } } }),
  ]);
  return reviews > 0 || done > 0;
}

export async function deleteWorkstream(workstreamId: string, actor: Actor): Promise<void> {
  const ws = await prisma.projectWorkstream.findUnique({ where: { id: workstreamId } });
  if (!ws) return;
  const milestones = await prisma.projectMilestone.findMany({
    where: { workstreamId },
    select: { id: true },
  });
  if (await milestoneHasHistory(milestones.map((m) => m.id))) {
    throw new ProjectError(
      "Bagian ini sudah punya riwayat pengerjaan dan tidak bisa dihapus. Pause project bila perlu.",
      "WORKSTREAM_HAS_HISTORY",
      409,
    );
  }
  await prisma.$transaction([
    prisma.projectWorkstream.delete({ where: { id: workstreamId } }),
    prisma.projectActivity.create({
      data: activityData({
        projectId: ws.projectId,
        action: "WORKSTREAM_DELETED",
        actor,
        message: `Bagian “${ws.name}” dihapus.`,
      }),
    }),
  ]);
  if (ws.ownerStaffId) await revokeLinkIfNoRole(ws.projectId, ws.ownerStaffId, actor);
}

/* ─── milestone ─── */

export async function createMilestone(
  workstreamId: string,
  input: {
    title: string;
    description?: string | null;
    weight?: number;
    deadline?: string | null;
    steps?: { item_text: string; is_required?: boolean; requires_evidence?: boolean }[];
  },
  actor: Actor,
): Promise<void> {
  const ws = await prisma.projectWorkstream.findUnique({ where: { id: workstreamId } });
  if (!ws) throw new ProjectError("Bagian tidak ditemukan", "WORKSTREAM_NOT_FOUND", 404);
  const last = await prisma.projectMilestone.findFirst({
    where: { workstreamId },
    orderBy: { sortOrder: "desc" },
  });
  const steps = (input.steps || [])
    .map((s) => ({ ...s, item_text: s.item_text.trim().slice(0, 500) }))
    .filter((s) => s.item_text);
  await prisma.$transaction(async (tx) => {
    const m = await tx.projectMilestone.create({
      data: {
        workstreamId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        weight: clampWeight(input.weight),
        deadline: parseDate(input.deadline),
        sortOrder: (last?.sortOrder || 0) + 10,
      },
    });
    if (steps.length) {
      await tx.projectMilestoneStep.createMany({
        data: steps.map((s, i) => ({
          milestoneId: m.id,
          itemText: s.item_text,
          isRequired: s.is_required !== false,
          requiresEvidence: Boolean(s.requires_evidence),
          sortOrder: (i + 1) * 10,
        })),
      });
    }
    await tx.projectActivity.create({
      data: activityData({
        projectId: ws.projectId,
        workstreamId,
        milestoneId: m.id,
        action: "MILESTONE_CREATED",
        actor,
        message: `Milestone “${m.title}” ditambahkan di ${ws.name}${steps.length ? ` dengan ${steps.length} langkah` : ""}.`,
      }),
    });
  });
}

export async function updateMilestone(
  milestoneId: string,
  patch: Partial<{
    title: string;
    description: string | null;
    weight: number;
    deadline: string | null;
  }>,
  actor: Actor,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const m = await lockMilestone(tx, milestoneId);
    if (isStructureLocked(m.status) && (patch.title !== undefined || patch.description !== undefined)) {
      throw new ProjectError(
        "Milestone sedang menunggu validasi atau sudah disetujui. Buka kembali dulu bila perlu diubah.",
        "MILESTONE_LOCKED",
        409,
      );
    }
    const ws = await tx.projectWorkstream.findUnique({ where: { id: m.workstreamId } });
    const data: Prisma.ProjectMilestoneUncheckedUpdateInput = {};
    if (patch.title !== undefined) {
      if (!patch.title.trim()) throw new ProjectError("Judul milestone wajib diisi", "TITLE_REQUIRED", 422);
      data.title = patch.title.trim();
    }
    if (patch.description !== undefined) data.description = patch.description?.trim() || null;
    if (patch.weight !== undefined) data.weight = clampWeight(patch.weight);
    if (patch.deadline !== undefined) data.deadline = parseDate(patch.deadline);
    await tx.projectMilestone.update({ where: { id: milestoneId }, data });
    if (patch.deadline !== undefined && ws) {
      await tx.projectActivity.create({
        data: activityData({
          projectId: ws.projectId,
          workstreamId: ws.id,
          milestoneId,
          action: "DEADLINE_CHANGED",
          actor,
          message: `Deadline milestone “${m.title}” diubah ke ${patch.deadline || "tanpa deadline"}.`,
        }),
      });
    }
  });
}

export async function deleteMilestone(milestoneId: string, actor: Actor): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const m = await lockMilestone(tx, milestoneId);
    if (m.status !== "NOT_STARTED") {
      throw new ProjectError(
        "Milestone ini sudah dikerjakan dan tidak bisa dihapus.",
        "MILESTONE_HAS_HISTORY",
        409,
      );
    }
    const reviews = await tx.projectMilestoneReview.count({ where: { milestoneId } });
    if (reviews) {
      throw new ProjectError("Milestone punya riwayat validasi.", "MILESTONE_HAS_HISTORY", 409);
    }
    const ws = await tx.projectWorkstream.findUnique({ where: { id: m.workstreamId } });
    await tx.projectMilestone.delete({ where: { id: milestoneId } });
    if (ws) {
      await tx.projectActivity.create({
        data: activityData({
          projectId: ws.projectId,
          workstreamId: ws.id,
          action: "MILESTONE_DELETED",
          actor,
          message: `Milestone “${m.title}” dihapus dari ${ws.name}.`,
        }),
      });
    }
  });
}

/** Buka kembali milestone DONE secara eksplisit (struktur & pengerjaan bisa direvisi). */
export async function reopenMilestone(milestoneId: string, note: string, actor: Actor): Promise<void> {
  if (!note.trim()) {
    throw new ProjectError("Alasan membuka kembali wajib diisi", "REOPEN_NOTE_REQUIRED", 422);
  }
  await prisma.$transaction(async (tx) => {
    const m = await lockMilestone(tx, milestoneId);
    if (m.status !== "DONE") {
      throw new ProjectError("Hanya milestone yang sudah disetujui yang bisa dibuka kembali", "NOT_DONE", 409);
    }
    const ws = await tx.projectWorkstream.findUnique({ where: { id: m.workstreamId } });
    await tx.projectMilestone.update({
      where: { id: milestoneId },
      data: { status: "REVISION", completedAt: null },
    });
    if (ws) {
      await tx.projectActivity.create({
        data: activityData({
          projectId: ws.projectId,
          workstreamId: ws.id,
          milestoneId,
          action: "MILESTONE_REOPENED",
          actor,
          message: `${actor.name || "Owner"} membuka kembali milestone “${m.title}”: ${note.trim()}`,
        }),
      });
    }
  });
}

/* ─── publish ─── */

export async function publishProject(
  projectId: string,
  actor: Actor,
): Promise<ProjectDetailDto> {
  const project = await getProject(projectId);
  if (!project) throw new ProjectError("Project tidak ditemukan", "PROJECT_NOT_FOUND", 404);
  if (!project.readiness.ready) {
    throw new ProjectError(
      `Belum siap dibagikan. ${project.readiness.details.join("; ")}`,
      "PROJECT_NOT_READY",
      422,
    );
  }
  if (!project.published_at) {
    await prisma.$transaction([
      prisma.project.update({ where: { id: projectId }, data: { publishedAt: new Date() } }),
      prisma.projectActivity.create({
        data: activityData({
          projectId,
          action: "PROJECT_PUBLISHED",
          actor,
          message: "Project dibagikan ke PIC (published).",
        }),
      }),
    ]);
  }
  return (await getProject(projectId))!;
}

export async function resolveBlocker(
  blockerId: string,
  actor: Actor,
): Promise<void> {
  const blocker = await prisma.projectBlocker.findUnique({ where: { id: blockerId } });
  if (!blocker || blocker.resolvedAt) return;
  await prisma.$transaction([
    prisma.projectBlocker.update({
      where: { id: blockerId },
      data: { resolvedAt: new Date(), resolvedByName: actor.name || null },
    }),
    prisma.projectActivity.create({
      data: activityData({
        projectId: blocker.projectId,
        workstreamId: blocker.workstreamId,
        milestoneId: blocker.milestoneId,
        action: "BLOCKER_RESOLVED",
        actor,
        message: `Kendala selesai: “${blocker.text.slice(0, 120)}”.`,
      }),
    }),
  ]);
}

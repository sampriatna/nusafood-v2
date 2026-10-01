import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import type {
  MilestoneStatus,
  ProjectDetailDto,
  ProjectHealth,
  ProjectMilestoneDto,
  ProjectMilestoneReviewDto,
  ProjectMilestoneStepDto,
  ProjectStaffOption,
  ProjectStatus,
  ProjectSummaryDto,
  ProjectWorkstreamDto,
} from "@/lib/project-types";

function dateOnly(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
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

function stepDto(row: {
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
  };
}

function milestoneDto(row: {
  id: string;
  workstreamId: string;
  title: string;
  description: string | null;
  weight: number;
  status: string;
  deadline: Date | null;
  evidenceUrl: string | null;
  completedAt: Date | null;
  sortOrder: number;
}, steps: ProjectMilestoneStepDto[] = [], latestReview: ProjectMilestoneReviewDto | null = null): ProjectMilestoneDto {
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
    steps,
    latest_review: latestReview,
  };
}

function calcWorkstreamProgress(
  status: string,
  milestones: ProjectMilestoneDto[],
): number {
  if (status === "COMPLETED") return 100;
  if (!milestones.length) return 0;
  const total = milestones.reduce((sum, item) => sum + Math.max(1, item.weight), 0);
  const done = milestones
    .filter((item) => item.status === "DONE")
    .reduce((sum, item) => sum + Math.max(1, item.weight), 0);
  return Math.round((done / total) * 100);
}

function calcProjectProgress(
  status: string,
  workstreams: ProjectWorkstreamDto[],
): number {
  if (status === "COMPLETED") return 100;
  if (!workstreams.length) return 0;
  const total = workstreams.reduce((sum, item) => sum + Math.max(1, item.weight), 0);
  const weighted = workstreams.reduce(
    (sum, item) => sum + item.progress * Math.max(1, item.weight),
    0,
  );
  return Math.round(weighted / total);
}

async function buildProjects(projectId?: string): Promise<ProjectDetailDto[]> {
  const projects = await prisma.project.findMany({
    where: projectId ? { id: projectId } : undefined,
    orderBy: { updatedAt: "desc" },
  });
  if (!projects.length) return [];

  const projectIds = projects.map((project) => project.id);
  const workstreams = await prisma.projectWorkstream.findMany({
    where: { projectId: { in: projectIds } },
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
  const [steps, reviews] = milestoneIds.length
    ? await Promise.all([
        prisma.projectMilestoneStep.findMany({
          where: { milestoneId: { in: milestoneIds } },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        }),
        prisma.projectMilestoneReview.findMany({
          where: { milestoneId: { in: milestoneIds } },
          orderBy: { submittedAt: "desc" },
        }),
      ])
    : [[], []];

  const stepDtos = steps.map(stepDto);
  const reviewDtos = reviews.map(reviewDto);
  const milestoneDtos = milestones.map((row) => {
    const ownSteps = stepDtos.filter((step) => step.milestone_id === row.id);
    const latestReview =
      reviewDtos.find((review) => review.milestone_id === row.id) || null;
    return milestoneDto(row, ownSteps, latestReview);
  });

  const workstreamDtos: ProjectWorkstreamDto[] = workstreams.map((row) => {
    const ownMilestones = milestoneDtos.filter(
      (milestone) => milestone.workstream_id === row.id,
    );
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
      progress: calcWorkstreamProgress(row.status, ownMilestones),
      milestones: ownMilestones,
    };
  });

  return projects.map((row) => {
    const ownWorkstreams = workstreamDtos.filter(
      (workstream) => workstream.project_id === row.id,
    );
    return {
      id: row.id,
      project_key: row.projectKey,
      name: row.name,
      goal: row.goal,
      lead_staff_id: row.leadStaffId,
      lead_name: row.leadName,
      status: row.status as ProjectStatus,
      health: row.health as ProjectHealth,
      start_date: dateOnly(row.startDate),
      deadline: dateOnly(row.deadline),
      next_action: row.nextAction,
      blocker: row.blocker,
      progress: calcProjectProgress(row.status, ownWorkstreams),
      workstream_count: ownWorkstreams.length,
      created_by: row.createdBy,
      workstreams: ownWorkstreams,
    };
  });
}

async function staffName(staffId?: string | null): Promise<string | null> {
  if (!staffId) return null;
  const staff = await prisma.staff.findUnique({
    where: { staffId },
    select: { name: true },
  });
  return staff?.name || null;
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

export async function listProjects(ownerStaffId?: string): Promise<ProjectSummaryDto[]> {
  const projects = await buildProjects();
  const filtered = ownerStaffId
    ? projects.filter(
        (project) =>
          project.lead_staff_id === ownerStaffId ||
          project.workstreams.some(
            (workstream) => workstream.owner_staff_id === ownerStaffId,
          ),
      )
    : projects;

  return filtered.map(({ workstreams: _workstreams, ...summary }) => summary);
}

export async function getProject(projectId: string): Promise<ProjectDetailDto | null> {
  const projects = await buildProjects(projectId);
  return projects[0] || null;
}

export async function createProject(input: {
  name: string;
  goal?: string | null;
  lead_staff_id?: string | null;
  start_date?: string | null;
  deadline?: string | null;
  next_action?: string | null;
  created_by?: string | null;
}): Promise<ProjectDetailDto> {
  const leadName = await staffName(input.lead_staff_id);
  const row = await prisma.project.create({
    data: {
      projectKey: `${slugify(input.name)}-${randomUUID().slice(0, 6)}`,
      name: input.name.trim(),
      goal: input.goal || null,
      leadStaffId: input.lead_staff_id || null,
      leadName,
      startDate: parseDate(input.start_date),
      deadline: parseDate(input.deadline),
      nextAction: input.next_action || null,
      createdBy: input.created_by || null,
    },
  });
  const project = await getProject(row.id);
  if (!project) throw new Error("Project gagal dibuat");
  return project;
}

export async function updateProject(
  projectId: string,
  patch: Partial<{
    name: string;
    goal: string | null;
    lead_staff_id: string | null;
    status: ProjectStatus;
    health: ProjectHealth;
    start_date: string | null;
    deadline: string | null;
    next_action: string | null;
    blocker: string | null;
  }>,
): Promise<ProjectDetailDto | null> {
  await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.goal !== undefined ? { goal: patch.goal } : {}),
      ...(patch.lead_staff_id !== undefined
        ? {
            leadStaffId: patch.lead_staff_id,
            leadName: await staffName(patch.lead_staff_id),
          }
        : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.health !== undefined ? { health: patch.health } : {}),
      ...(patch.start_date !== undefined
        ? { startDate: parseDate(patch.start_date) }
        : {}),
      ...(patch.deadline !== undefined
        ? { deadline: parseDate(patch.deadline) }
        : {}),
      ...(patch.next_action !== undefined
        ? { nextAction: patch.next_action }
        : {}),
      ...(patch.blocker !== undefined ? { blocker: patch.blocker } : {}),
    },
  });
  return getProject(projectId);
}

export async function createWorkstream(
  projectId: string,
  input: {
    name: string;
    owner_staff_id?: string | null;
    weight?: number;
    deadline?: string | null;
    next_action?: string | null;
  },
): Promise<void> {
  await prisma.projectWorkstream.create({
    data: {
      projectId,
      name: input.name.trim(),
      ownerStaffId: input.owner_staff_id || null,
      ownerName: await staffName(input.owner_staff_id),
      weight: Math.max(1, Math.min(100, Number(input.weight || 1))),
      deadline: parseDate(input.deadline),
      nextAction: input.next_action || null,
    },
  });
}

export async function updateWorkstream(
  workstreamId: string,
  patch: Partial<{
    owner_staff_id: string | null;
    weight: number;
    status: ProjectStatus;
    health: ProjectHealth;
    deadline: string | null;
    next_action: string | null;
    blocker: string | null;
  }>,
): Promise<void> {
  await prisma.projectWorkstream.update({
    where: { id: workstreamId },
    data: {
      ...(patch.owner_staff_id !== undefined
        ? {
            ownerStaffId: patch.owner_staff_id,
            ownerName: await staffName(patch.owner_staff_id),
          }
        : {}),
      ...(patch.weight !== undefined
        ? { weight: Math.max(1, Math.min(100, Number(patch.weight || 1))) }
        : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.health !== undefined ? { health: patch.health } : {}),
      ...(patch.deadline !== undefined
        ? { deadline: parseDate(patch.deadline) }
        : {}),
      ...(patch.next_action !== undefined
        ? { nextAction: patch.next_action }
        : {}),
      ...(patch.blocker !== undefined ? { blocker: patch.blocker } : {}),
    },
  });
}

export async function createMilestone(
  workstreamId: string,
  input: {
    title: string;
    description?: string | null;
    weight?: number;
    deadline?: string | null;
  },
): Promise<void> {
  await prisma.projectMilestone.create({
    data: {
      workstreamId,
      title: input.title.trim(),
      description: input.description || null,
      weight: Math.max(1, Math.min(100, Number(input.weight || 1))),
      deadline: parseDate(input.deadline),
    },
  });
}

export async function updateMilestone(
  milestoneId: string,
  patch: Partial<{
    status: MilestoneStatus;
    evidence_url: string | null;
  }>,
): Promise<void> {
  await prisma.projectMilestone.update({
    where: { id: milestoneId },
    data: {
      ...(patch.status !== undefined
        ? {
            status: patch.status,
            completedAt: patch.status === "DONE" ? new Date() : null,
          }
        : {}),
      ...(patch.evidence_url !== undefined
        ? { evidenceUrl: patch.evidence_url }
        : {}),
    },
  });
}

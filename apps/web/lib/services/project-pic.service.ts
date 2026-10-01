import { prisma } from "@/lib/db";
import { generateToken, getAppOrigin } from "@/lib/id";
import type {
  ProjectMilestoneStepDto,
  ProjectPicLinkDto,
  ProjectPicViewDto,
} from "@/lib/project-types";
import { getProject } from "@/lib/services/project.service";

export class ProjectPicError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = "PROJECT_PIC_ERROR", status = 400) {
    super(message);
    this.name = "ProjectPicError";
    this.code = code;
    this.status = status;
  }
}

function dateTime(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
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

function picLinkDto(
  row: {
    id: string;
    projectId: string;
    staffId: string;
    shortCode: string;
    isActive: boolean;
  },
  staffName: string,
): ProjectPicLinkDto {
  return {
    id: row.id,
    project_id: row.projectId,
    staff_id: row.staffId,
    staff_name: staffName,
    short_code: row.shortCode,
    path: `/p/${row.shortCode}`,
    is_active: row.isActive,
  };
}

async function resolveActiveLink(key: string) {
  const value = key.trim();
  const link = await prisma.projectPicLink.findFirst({
    where: {
      isActive: true,
      OR: [
        { token: value },
        { shortCode: { equals: value, mode: "insensitive" } },
      ],
    },
  });
  if (!link) {
    throw new ProjectPicError(
      "Link project tidak valid atau sudah dinonaktifkan",
      "INVALID_PROJECT_LINK",
      404,
    );
  }

  const [project, staff] = await Promise.all([
    prisma.project.findUnique({ where: { id: link.projectId } }),
    prisma.staff.findUnique({ where: { staffId: link.staffId } }),
  ]);
  if (!project || !staff) {
    throw new ProjectPicError(
      "Data project atau PIC tidak ditemukan",
      "PROJECT_PIC_NOT_FOUND",
      404,
    );
  }

  return { link, project, staff };
}

async function assertAssigned(projectId: string, staffId: string) {
  const [project, ownedCount] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId } }),
    prisma.projectWorkstream.count({ where: { projectId, ownerStaffId: staffId } }),
  ]);
  if (!project) {
    throw new ProjectPicError("Project tidak ditemukan", "PROJECT_NOT_FOUND", 404);
  }
  if (project.leadStaffId !== staffId && ownedCount === 0) {
    throw new ProjectPicError(
      "Staff ini belum menjadi PIC di project",
      "PIC_NOT_ASSIGNED",
      422,
    );
  }
  return project;
}

export async function ensureProjectPicLink(
  projectId: string,
  staffId: string,
): Promise<ProjectPicLinkDto> {
  await assertAssigned(projectId, staffId);
  const staff = await prisma.staff.findUnique({ where: { staffId } });
  if (!staff) {
    throw new ProjectPicError("Staff tidak ditemukan", "STAFF_NOT_FOUND", 404);
  }

  const existing = await prisma.projectPicLink.findUnique({
    where: { projectId_staffId: { projectId, staffId } },
  });

  const shortCode = `PRJ-${generateToken(8).toUpperCase()}`;
  const token = generateToken(48);

  const link = existing
    ? await prisma.projectPicLink.update({
        where: { id: existing.id },
        data: existing.isActive
          ? {}
          : {
              token,
              shortCode,
              isActive: true,
              revokedAt: null,
            },
      })
    : await prisma.projectPicLink.create({
        data: {
          projectId,
          staffId,
          token,
          shortCode,
        },
      });

  return picLinkDto(link, staff.name);
}

export async function listProjectPicLinks(
  projectId: string,
): Promise<ProjectPicLinkDto[]> {
  const links = await prisma.projectPicLink.findMany({
    where: { projectId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  const staffIds = [...new Set(links.map((link) => link.staffId))];
  const staff = staffIds.length
    ? await prisma.staff.findMany({
        where: { staffId: { in: staffIds } },
        select: { staffId: true, name: true },
      })
    : [];
  const names = new Map(staff.map((row) => [row.staffId, row.name]));
  return links.map((link) => picLinkDto(link, names.get(link.staffId) || "PIC"));
}

export async function revokeProjectPicLink(
  projectId: string,
  staffId: string,
): Promise<void> {
  const existing = await prisma.projectPicLink.findUnique({
    where: { projectId_staffId: { projectId, staffId } },
  });
  if (!existing) return;
  await prisma.projectPicLink.update({
    where: { id: existing.id },
    data: { isActive: false, revokedAt: new Date() },
  });
}

export async function getProjectPicView(key: string): Promise<ProjectPicViewDto> {
  const { link, project, staff } = await resolveActiveLink(key);
  const detail = await getProject(project.id);
  if (!detail) {
    throw new ProjectPicError("Project tidak ditemukan", "PROJECT_NOT_FOUND", 404);
  }

  const workstreams =
    project.leadStaffId === staff.staffId
      ? detail.workstreams
      : detail.workstreams.filter(
          (workstream) => workstream.owner_staff_id === staff.staffId,
        );

  if (!workstreams.length && project.leadStaffId !== staff.staffId) {
    throw new ProjectPicError(
      "Kamu tidak lagi menjadi PIC di project ini",
      "PIC_NOT_ASSIGNED",
      403,
    );
  }

  return {
    staff: {
      staff_id: staff.staffId,
      name: staff.name,
      position: staff.position || "",
    },
    project: {
      id: detail.id,
      name: detail.name,
      goal: detail.goal,
      deadline: detail.deadline,
      next_action: detail.next_action,
      progress: detail.progress,
    },
    link: picLinkDto(link, staff.name),
    workstreams,
  };
}

async function assertMilestoneAccess(key: string, milestoneId: string) {
  const context = await resolveActiveLink(key);
  const milestone = await prisma.projectMilestone.findUnique({
    where: { id: milestoneId },
  });
  if (!milestone) {
    throw new ProjectPicError("Milestone tidak ditemukan", "MILESTONE_NOT_FOUND", 404);
  }
  const workstream = await prisma.projectWorkstream.findUnique({
    where: { id: milestone.workstreamId },
  });
  if (!workstream || workstream.projectId !== context.project.id) {
    throw new ProjectPicError("Akses milestone ditolak", "FORBIDDEN", 403);
  }
  const allowed =
    context.project.leadStaffId === context.staff.staffId ||
    workstream.ownerStaffId === context.staff.staffId;
  if (!allowed) {
    throw new ProjectPicError("Milestone bukan tanggung jawab kamu", "FORBIDDEN", 403);
  }
  return { ...context, milestone, workstream };
}

export async function addMilestoneStep(
  milestoneId: string,
  input: {
    item_text: string;
    is_required?: boolean;
    requires_evidence?: boolean;
  },
): Promise<ProjectMilestoneStepDto> {
  const milestone = await prisma.projectMilestone.findUnique({
    where: { id: milestoneId },
  });
  if (!milestone) {
    throw new ProjectPicError("Milestone tidak ditemukan", "MILESTONE_NOT_FOUND", 404);
  }
  if (milestone.status === "WAITING_VALIDATION" || milestone.status === "DONE") {
    throw new ProjectPicError(
      "Checklist tidak bisa diubah saat menunggu validasi atau sudah selesai",
      "MILESTONE_LOCKED",
      409,
    );
  }

  const last = await prisma.projectMilestoneStep.findFirst({
    where: { milestoneId },
    orderBy: { sortOrder: "desc" },
  });
  const row = await prisma.projectMilestoneStep.create({
    data: {
      milestoneId,
      itemText: input.item_text.trim(),
      isRequired: input.is_required !== false,
      requiresEvidence: Boolean(input.requires_evidence),
      sortOrder: (last?.sortOrder || 0) + 10,
    },
  });
  return stepDto(row);
}

export async function deleteMilestoneStep(stepId: string): Promise<void> {
  const step = await prisma.projectMilestoneStep.findUnique({ where: { id: stepId } });
  if (!step) return;
  const milestone = await prisma.projectMilestone.findUnique({
    where: { id: step.milestoneId },
  });
  if (milestone?.status === "WAITING_VALIDATION" || milestone?.status === "DONE") {
    throw new ProjectPicError("Checklist sedang terkunci", "MILESTONE_LOCKED", 409);
  }
  await prisma.projectMilestoneStep.delete({ where: { id: stepId } });
}

export async function updateProjectPicStep(
  key: string,
  stepId: string,
  input: {
    is_checked?: boolean;
    note?: string | null;
    evidence_url?: string | null;
  },
): Promise<ProjectMilestoneStepDto> {
  if (input.evidence_url && !/^https?:\/\//i.test(input.evidence_url.trim())) {
    throw new ProjectPicError("Link bukti harus diawali http:// atau https://", "INVALID_EVIDENCE_URL", 422);
  }
  const step = await prisma.projectMilestoneStep.findUnique({ where: { id: stepId } });
  if (!step) {
    throw new ProjectPicError("Langkah tidak ditemukan", "STEP_NOT_FOUND", 404);
  }
  const access = await assertMilestoneAccess(key, step.milestoneId);
  if (
    access.milestone.status === "WAITING_VALIDATION" ||
    access.milestone.status === "DONE"
  ) {
    throw new ProjectPicError(
      "Milestone sedang menunggu validasi atau sudah disetujui",
      "MILESTONE_LOCKED",
      409,
    );
  }

  const checked =
    input.is_checked === undefined ? step.isChecked : Boolean(input.is_checked);
  const row = await prisma.projectMilestoneStep.update({
    where: { id: stepId },
    data: {
      ...(input.is_checked !== undefined ? { isChecked: checked } : {}),
      ...(input.note !== undefined ? { note: input.note || null } : {}),
      ...(input.evidence_url !== undefined
        ? { evidenceUrl: input.evidence_url || null }
        : {}),
      completedByStaffId: checked ? access.staff.staffId : null,
      completedAt: checked ? new Date() : null,
    },
  });

  if (
    access.milestone.status === "NOT_STARTED" ||
    access.milestone.status === "REVISION"
  ) {
    await prisma.projectMilestone.update({
      where: { id: access.milestone.id },
      data: { status: "IN_PROGRESS", completedAt: null },
    });
  }

  return stepDto(row);
}

export async function assertProjectPicStepAccess(key: string, stepId: string) {
  const step = await prisma.projectMilestoneStep.findUnique({ where: { id: stepId } });
  if (!step) {
    throw new ProjectPicError("Langkah tidak ditemukan", "STEP_NOT_FOUND", 404);
  }
  const access = await assertMilestoneAccess(key, step.milestoneId);
  if (
    access.milestone.status === "WAITING_VALIDATION" ||
    access.milestone.status === "DONE"
  ) {
    throw new ProjectPicError("Milestone sedang terkunci", "MILESTONE_LOCKED", 409);
  }
  return { ...access, step };
}

export async function submitProjectMilestone(
  key: string,
  milestoneId: string,
): Promise<void> {
  const access = await assertMilestoneAccess(key, milestoneId);
  if (access.milestone.status === "WAITING_VALIDATION") {
    throw new ProjectPicError(
      "Milestone sudah diajukan dan sedang menunggu validasi",
      "ALREADY_SUBMITTED",
      409,
    );
  }
  if (access.milestone.status === "DONE") {
    throw new ProjectPicError("Milestone sudah disetujui", "ALREADY_DONE", 409);
  }

  const steps = await prisma.projectMilestoneStep.findMany({
    where: { milestoneId },
    orderBy: { sortOrder: "asc" },
  });
  if (!steps.length) {
    throw new ProjectPicError(
      "Milestone belum memiliki checklist langkah kerja",
      "CHECKLIST_EMPTY",
      422,
    );
  }

  const missing = steps.filter((step) => step.isRequired && !step.isChecked);
  if (missing.length) {
    throw new ProjectPicError(
      `Masih ada ${missing.length} langkah wajib yang belum selesai`,
      "CHECKLIST_INCOMPLETE",
      422,
    );
  }

  const missingEvidence = steps.filter(
    (step) => step.requiresEvidence && !step.evidenceUrl,
  );
  if (missingEvidence.length) {
    throw new ProjectPicError(
      `Masih ada ${missingEvidence.length} bukti yang wajib diupload`,
      "EVIDENCE_REQUIRED",
      422,
    );
  }

  await prisma.$transaction([
    prisma.projectMilestoneReview.create({
      data: {
        milestoneId,
        submittedByStaffId: access.staff.staffId,
        submittedByName: access.staff.name,
        status: "PENDING",
      },
    }),
    prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: { status: "WAITING_VALIDATION", completedAt: null },
    }),
  ]);
}

export async function reviewProjectMilestone(
  milestoneId: string,
  input: {
    decision: "APPROVED" | "REVISION";
    note?: string | null;
    reviewed_by?: string | null;
    reviewed_by_name?: string | null;
  },
): Promise<void> {
  if (input.decision === "REVISION" && !input.note?.trim()) {
    throw new ProjectPicError(
      "Catatan revisi wajib diisi",
      "REVISION_NOTE_REQUIRED",
      422,
    );
  }

  const review = await prisma.projectMilestoneReview.findFirst({
    where: { milestoneId, status: "PENDING" },
    orderBy: { submittedAt: "desc" },
  });
  if (!review) {
    throw new ProjectPicError(
      "Tidak ada pengajuan validasi yang menunggu",
      "NO_PENDING_REVIEW",
      409,
    );
  }

  await prisma.$transaction([
    prisma.projectMilestoneReview.update({
      where: { id: review.id },
      data: {
        status: input.decision,
        reviewedBy: input.reviewed_by || null,
        reviewedByName: input.reviewed_by_name || null,
        reviewedAt: new Date(),
        reviewNote: input.note?.trim() || null,
      },
    }),
    prisma.projectMilestone.update({
      where: { id: milestoneId },
      data:
        input.decision === "APPROVED"
          ? { status: "DONE", completedAt: new Date() }
          : { status: "REVISION", completedAt: null },
    }),
  ]);
}

export function absoluteProjectPicLink(shortCode: string): string {
  const origin = getAppOrigin();
  const path = `/p/${shortCode}`;
  return origin ? `${origin}${path}` : path;
}

import { prisma } from "@/lib/db";
import { generateToken, getAppOrigin } from "@/lib/id";
import { ProjectError } from "@/lib/project-errors";
import {
  calcProjectProgress,
  canSubmitFromStatus,
  canWorkOnWorkstream,
  checkMilestoneSubmit,
  computeFocus,
  isStructureLocked,
  picScope,
  type PicScope,
} from "@/lib/project-logic";
import type {
  ProjectMilestoneStepDto,
  ProjectPicLinkDto,
  ProjectPicViewDto,
} from "@/lib/project-types";
import {
  activityData,
  type Actor,
} from "@/lib/services/project-activity.service";
import {
  getProject,
  lockMilestone,
  publishProject,
  stepDto,
} from "@/lib/services/project.service";

/** Alias lama: route PIC sudah memakai nama ini. */
export class ProjectPicError extends ProjectError {}

function err(message: string, code: string, status: number): never {
  throw new ProjectPicError(message, code, status);
}

/* ─── link ─── */

function picLinkDto(
  row: { id: string; projectId: string; staffId: string; shortCode: string; isActive: boolean },
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

/** Kode pendek = identifier yang juga unik dan tidak bisa ditebak (96 bit), bukan 32 bit. */
function newShortCode(): string {
  return `PRJ-${generateToken(24).toUpperCase()}`;
}

async function resolveActiveLink(key: string) {
  const value = key.trim();
  if (!value || value.length > 128) {
    err("Link project tidak valid atau sudah dinonaktifkan.", "INVALID_PROJECT_LINK", 404);
  }
  const link = await prisma.projectPicLink.findFirst({
    where: {
      isActive: true,
      OR: [{ token: value }, { shortCode: { equals: value, mode: "insensitive" } }],
    },
  });
  if (!link) err("Link project tidak valid atau sudah dinonaktifkan.", "INVALID_PROJECT_LINK", 404);

  const [project, staff] = await Promise.all([
    prisma.project.findUnique({ where: { id: link.projectId } }),
    prisma.staff.findUnique({ where: { staffId: link.staffId } }),
  ]);
  if (!project || !staff || staff.status !== "ACTIVE") {
    err("Link project tidak valid atau sudah dinonaktifkan.", "INVALID_PROJECT_LINK", 404);
  }
  return { link, project, staff };
}

async function scopeOf(project: { id: string; leadStaffId: string | null }, staffId: string) {
  const workstreams = await prisma.projectWorkstream.findMany({
    where: { projectId: project.id },
    select: { id: true, ownerStaffId: true },
  });
  return picScope(project.leadStaffId, workstreams, staffId);
}

async function assertAssigned(projectId: string, staffId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) err("Project tidak ditemukan", "PROJECT_NOT_FOUND", 404);
  const scope = await scopeOf(project, staffId);
  if (scope.kind === "NONE") {
    err("Staff ini belum menjadi PIC di project", "PIC_NOT_ASSIGNED", 422);
  }
  return project;
}

export async function ensureProjectPicLink(
  projectId: string,
  staffId: string,
  actor: Actor,
  options: { rotate?: boolean } = {},
): Promise<ProjectPicLinkDto> {
  const project = await assertAssigned(projectId, staffId);
  if (!project.publishedAt) {
    err("Project belum dipublish. Lengkapi milestone & checklist lalu bagikan.", "PROJECT_NOT_PUBLISHED", 422);
  }
  const staff = await prisma.staff.findUnique({ where: { staffId } });
  if (!staff || staff.status !== "ACTIVE") err("PIC harus staff aktif", "PIC_NOT_ACTIVE", 422);

  const existing = await prisma.projectPicLink.findUnique({
    where: { projectId_staffId: { projectId, staffId } },
  });
  if (existing?.isActive && !options.rotate) return picLinkDto(existing, staff.name);

  const fresh = { token: generateToken(48), shortCode: newShortCode(), isActive: true, revokedAt: null };
  const action = existing ? (existing.isActive ? "LINK_ROTATED" : "LINK_GENERATED") : "LINK_GENERATED";
  const message = existing?.isActive
    ? `Link PIC ${staff.name} diganti dengan link baru (link lama tidak berlaku).`
    : `Link PIC ${staff.name} dibuat.`;
  const [link] = await prisma.$transaction([
    existing
      ? prisma.projectPicLink.update({ where: { id: existing.id }, data: fresh })
      : prisma.projectPicLink.create({ data: { projectId, staffId, ...fresh } }),
    prisma.projectActivity.create({
      data: activityData({ projectId, action, actor, message }),
    }),
  ]);
  return picLinkDto(link, staff.name);
}

export async function listProjectPicLinks(projectId: string): Promise<ProjectPicLinkDto[]> {
  const links = await prisma.projectPicLink.findMany({
    where: { projectId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  const staffIds = [...new Set(links.map((l) => l.staffId))];
  const staff = staffIds.length
    ? await prisma.staff.findMany({
        where: { staffId: { in: staffIds } },
        select: { staffId: true, name: true },
      })
    : [];
  const names = new Map(staff.map((s) => [s.staffId, s.name]));
  return links.map((l) => picLinkDto(l, names.get(l.staffId) || "PIC"));
}

export async function revokeProjectPicLink(
  projectId: string,
  staffId: string,
  actor: Actor,
): Promise<void> {
  const existing = await prisma.projectPicLink.findUnique({
    where: { projectId_staffId: { projectId, staffId } },
  });
  if (!existing || !existing.isActive) return;
  const staff = await prisma.staff.findUnique({ where: { staffId }, select: { name: true } });
  await prisma.$transaction([
    prisma.projectPicLink.update({
      where: { id: existing.id },
      data: { isActive: false, revokedAt: new Date() },
    }),
    prisma.projectActivity.create({
      data: activityData({
        projectId,
        action: "LINK_REVOKED",
        actor,
        message: `Link PIC ${staff?.name || ""} dinonaktifkan.`,
      }),
    }),
  ]);
}

/** "Bagikan ke PIC": publish (hanya bila readiness lolos) lalu buat link untuk semua PIC. */
export async function publishAndShare(
  projectId: string,
  actor: Actor,
): Promise<{ links: ProjectPicLinkDto[] }> {
  const project = await publishProject(projectId, actor);
  const picIds = [
    ...new Set(
      [project.lead_staff_id, ...project.workstreams.map((w) => w.owner_staff_id)].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  ];
  const links: ProjectPicLinkDto[] = [];
  for (const staffId of picIds) links.push(await ensureProjectPicLink(projectId, staffId, actor));
  return { links };
}

/* ─── tampilan PIC ─── */

function emptyView(
  ctx: Awaited<ReturnType<typeof resolveActiveLink>>,
  scope: PicScope,
): ProjectPicViewDto {
  return {
    state: "PREPARING",
    staff: { staff_id: ctx.staff.staffId, name: ctx.staff.name, position: ctx.staff.position || "" },
    project: {
      id: ctx.project.id,
      name: ctx.project.name,
      goal: null,
      deadline: null,
      progress: 0,
      milestone_done: 0,
      milestone_total: 0,
    },
    scope: scope.kind === "ALL" ? "ALL" : "OWN",
    link: picLinkDto(ctx.link, ctx.staff.name),
    workstreams: [],
    focus: null,
    blockers: [],
  };
}

export async function getProjectPicView(key: string): Promise<ProjectPicViewDto> {
  const ctx = await resolveActiveLink(key);
  const scope = await scopeOf(ctx.project, ctx.staff.staffId);
  if (scope.kind === "NONE") {
    err("Kamu tidak lagi menjadi PIC pada bagian ini.", "PIC_NOT_ASSIGNED", 403);
  }

  const detail = await getProject(ctx.project.id);
  if (!detail) err("Project tidak ditemukan", "PROJECT_NOT_FOUND", 404);

  // Hanya bagian yang menjadi tanggung jawab PIC, dan hanya yang sudah berisi pekerjaan nyata.
  const visible = detail.workstreams
    .filter((w) => canWorkOnWorkstream(scope, w.id))
    .map((w) => ({
      ...w,
      milestones: w.milestones.filter((m) => m.steps.length > 0),
    }))
    .filter((w) => w.milestones.length > 0);

  if (!detail.published_at || !visible.length) return emptyView(ctx, scope);

  const milestones = visible.flatMap((w) => w.milestones);
  const progress =
    scope.kind === "ALL" ? detail.progress : calcProjectProgress(visible);
  const visibleIds = new Set(visible.map((w) => w.id));

  return {
    state: "READY",
    staff: { staff_id: ctx.staff.staffId, name: ctx.staff.name, position: ctx.staff.position || "" },
    project: {
      id: detail.id,
      name: detail.name,
      goal: detail.goal,
      deadline: detail.deadline,
      progress,
      milestone_done: milestones.filter((m) => m.status === "DONE").length,
      milestone_total: milestones.length,
    },
    scope: scope.kind === "ALL" ? "ALL" : "OWN",
    link: picLinkDto(ctx.link, ctx.staff.name),
    workstreams: visible,
    focus: computeFocus(milestones),
    blockers: detail.blockers.filter(
      (b) => scope.kind === "ALL" || (b.workstream_id && visibleIds.has(b.workstream_id)),
    ),
  };
}

/* ─── aksi PIC ─── */

async function assertMilestoneAccess(key: string, milestoneId: string) {
  const ctx = await resolveActiveLink(key);
  const milestone = await prisma.projectMilestone.findUnique({ where: { id: milestoneId } });
  if (!milestone) err("Milestone tidak ditemukan", "MILESTONE_NOT_FOUND", 404);
  const workstream = await prisma.projectWorkstream.findUnique({
    where: { id: milestone.workstreamId },
  });
  if (!workstream || workstream.projectId !== ctx.project.id) {
    err("Akses milestone ditolak", "FORBIDDEN", 403);
  }
  const scope = await scopeOf(ctx.project, ctx.staff.staffId);
  if (scope.kind === "NONE") {
    err("Kamu tidak lagi menjadi PIC pada bagian ini.", "PIC_NOT_ASSIGNED", 403);
  }
  if (!canWorkOnWorkstream(scope, workstream.id)) {
    err("Milestone ini bukan tanggung jawab kamu", "FORBIDDEN", 403);
  }
  if (!ctx.project.publishedAt) {
    err("Project sedang disiapkan", "PROJECT_NOT_PUBLISHED", 409);
  }
  if (ctx.project.status !== "ACTIVE") {
    err("Project sedang dijeda atau sudah ditutup", "PROJECT_NOT_ACTIVE", 409);
  }
  return { ...ctx, milestone, workstream };
}

const LOCKED_MESSAGE = "Milestone sedang menunggu validasi atau sudah disetujui.";

export async function assertProjectPicStepAccess(key: string, stepId: string) {
  const step = await prisma.projectMilestoneStep.findUnique({ where: { id: stepId } });
  if (!step) err("Langkah ini sudah dihapus. Muat ulang halaman.", "STEP_NOT_FOUND", 404);
  const access = await assertMilestoneAccess(key, step.milestoneId);
  if (isStructureLocked(access.milestone.status)) err(LOCKED_MESSAGE, "MILESTONE_LOCKED", 409);
  return { ...access, step };
}

export async function updateProjectPicStep(
  key: string,
  stepId: string,
  input: { is_checked?: boolean; note?: string | null; evidence_url?: string | null },
): Promise<ProjectMilestoneStepDto> {
  if (input.evidence_url && !/^https?:\/\/\S+$/i.test(input.evidence_url.trim())) {
    err("Link bukti harus diawali http:// atau https://", "INVALID_EVIDENCE_URL", 422);
  }
  if (input.note && input.note.length > 1000) {
    err("Catatan terlalu panjang (maks 1000 karakter)", "NOTE_TOO_LONG", 422);
  }
  const first = await assertProjectPicStepAccess(key, stepId);
  const { staff, workstream, project } = first;

  return prisma.$transaction(async (tx) => {
    // Kunci milestone lalu validasi ulang: owner mungkin baru saja menyetujui / menghapus langkah.
    const milestone = await lockMilestone(tx, first.milestone.id);
    if (isStructureLocked(milestone.status)) err(LOCKED_MESSAGE, "MILESTONE_LOCKED", 409);
    const step = await tx.projectMilestoneStep.findUnique({ where: { id: stepId } });
    if (!step) err("Langkah ini sudah dihapus. Muat ulang halaman.", "STEP_NOT_FOUND", 404);

    const toggled = input.is_checked !== undefined && Boolean(input.is_checked) !== step.isChecked;
    const checked = input.is_checked === undefined ? step.isChecked : Boolean(input.is_checked);
    const evidenceChanged =
      input.evidence_url !== undefined && (input.evidence_url || null) !== step.evidenceUrl;
    const noteChanged = input.note !== undefined && (input.note?.trim() || null) !== (step.note || null);

    const row = await tx.projectMilestoneStep.update({
      where: { id: stepId },
      data: {
        ...(noteChanged ? { note: input.note?.trim() || null } : {}),
        ...(input.evidence_url !== undefined ? { evidenceUrl: input.evidence_url?.trim() || null } : {}),
        ...(toggled
          ? {
              isChecked: checked,
              completedByStaffId: checked ? staff.staffId : null,
              completedAt: checked ? new Date() : null,
            }
          : {}),
      },
    });

    const logs: { action: string; message: string }[] = [];
    if (milestone.status === "NOT_STARTED" || milestone.status === "REVISION") {
      await tx.projectMilestone.update({
        where: { id: milestone.id },
        data: { status: "IN_PROGRESS", completedAt: null },
      });
      logs.push({
        action: milestone.status === "REVISION" ? "REVISION_STARTED" : "MILESTONE_STARTED",
        message:
          milestone.status === "REVISION"
            ? `${staff.name} mulai memperbaiki milestone “${milestone.title}”.`
            : `${staff.name} mulai mengerjakan milestone “${milestone.title}”.`,
      });
    }
    if (toggled) {
      logs.push({
        action: checked ? "STEP_COMPLETED" : "STEP_UNCHECKED",
        message: checked
          ? `${staff.name} menyelesaikan langkah “${step.itemText}”.`
          : `${staff.name} membatalkan centang langkah “${step.itemText}”.`,
      });
    }
    if (evidenceChanged && input.evidence_url) {
      logs.push({
        action: "EVIDENCE_UPLOADED",
        message: `${staff.name} mengunggah bukti untuk langkah “${step.itemText}”.`,
      });
    }
    if (noteChanged && input.note?.trim()) {
      logs.push({
        action: "STEP_NOTE",
        message: `${staff.name} menulis catatan pada “${step.itemText}”: ${input.note.trim().slice(0, 200)}`,
      });
    }
    for (const log of logs) {
      await tx.projectActivity.create({
        data: activityData({
          projectId: project.id,
          workstreamId: workstream.id,
          milestoneId: milestone.id,
          action: log.action,
          actor: { type: "PIC", id: staff.staffId, name: staff.name },
          message: log.message,
        }),
      });
    }
    return stepDto(row);
  });
}

export async function submitProjectMilestone(key: string, milestoneId: string): Promise<void> {
  const access = await assertMilestoneAccess(key, milestoneId);
  const { staff, project, workstream } = access;

  await prisma.$transaction(async (tx) => {
    const milestone = await lockMilestone(tx, milestoneId);
    if (milestone.status === "WAITING_VALIDATION") {
      err("Milestone sudah diajukan dan sedang menunggu validasi.", "ALREADY_SUBMITTED", 409);
    }
    if (!canSubmitFromStatus(milestone.status)) {
      err("Milestone sudah disetujui.", "ALREADY_DONE", 409);
    }
    const steps = await tx.projectMilestoneStep.findMany({
      where: { milestoneId },
      orderBy: { sortOrder: "asc" },
    });
    const check = checkMilestoneSubmit(
      steps.map((s) => ({
        is_required: s.isRequired,
        requires_evidence: s.requiresEvidence,
        is_checked: s.isChecked,
        evidence_url: s.evidenceUrl,
      })),
    );
    if (!check.canSubmit) {
      const code = check.noSteps
        ? "CHECKLIST_EMPTY"
        : check.missingRequired
          ? "CHECKLIST_INCOMPLETE"
          : "EVIDENCE_REQUIRED";
      err(check.reasons[0].replace(/\.$/, ""), code, 422);
    }
    const prior = await tx.projectMilestoneReview.count({ where: { milestoneId } });
    await tx.projectMilestoneReview.create({
      data: {
        milestoneId,
        submittedByStaffId: staff.staffId,
        submittedByName: staff.name,
        status: "PENDING",
        snapshot: steps.map((s) => ({
          item_text: s.itemText,
          is_required: s.isRequired,
          is_checked: s.isChecked,
          note: s.note || "",
          evidence_url: s.evidenceUrl,
        })),
      },
    });
    await tx.projectMilestone.update({
      where: { id: milestoneId },
      data: { status: "WAITING_VALIDATION", completedAt: null },
    });
    await tx.projectActivity.create({
      data: activityData({
        projectId: project.id,
        workstreamId: workstream.id,
        milestoneId,
        action: "MILESTONE_SUBMITTED",
        actor: { type: "PIC", id: staff.staffId, name: staff.name },
        message: `${staff.name} mengajukan validasi milestone “${milestone.title}”${prior ? ` (pengajuan ke-${prior + 1})` : ""}.`,
      }),
    });
  });
}

export async function reportProjectBlocker(
  key: string,
  input: { milestone_id: string; text: string },
): Promise<void> {
  const text = input.text.trim();
  if (!text) err("Tulis kendalanya dulu", "BLOCKER_TEXT_REQUIRED", 422);
  if (text.length > 1000) err("Kendala terlalu panjang (maks 1000 karakter)", "BLOCKER_TOO_LONG", 422);
  const { staff, project, workstream, milestone } = await assertMilestoneAccess(key, input.milestone_id);
  await prisma.$transaction([
    prisma.projectBlocker.create({
      data: {
        projectId: project.id,
        workstreamId: workstream.id,
        milestoneId: milestone.id,
        reportedByStaffId: staff.staffId,
        reportedByName: staff.name,
        text,
      },
    }),
    prisma.projectActivity.create({
      data: activityData({
        projectId: project.id,
        workstreamId: workstream.id,
        milestoneId: milestone.id,
        action: "BLOCKER_REPORTED",
        actor: { type: "PIC", id: staff.staffId, name: staff.name },
        message: `${staff.name} melaporkan kendala pada “${milestone.title}”: ${text.slice(0, 200)}`,
      }),
    }),
  ]);
}

export async function resolveProjectPicBlocker(key: string, blockerId: string): Promise<void> {
  const blocker = await prisma.projectBlocker.findUnique({ where: { id: blockerId } });
  if (!blocker || blocker.resolvedAt) return;
  if (!blocker.milestoneId) err("Akses ditolak", "FORBIDDEN", 403);
  const { staff } = await assertMilestoneAccess(key, blocker.milestoneId);
  await prisma.$transaction([
    prisma.projectBlocker.update({
      where: { id: blockerId },
      data: { resolvedAt: new Date(), resolvedByName: staff.name },
    }),
    prisma.projectActivity.create({
      data: activityData({
        projectId: blocker.projectId,
        workstreamId: blocker.workstreamId,
        milestoneId: blocker.milestoneId,
        action: "BLOCKER_RESOLVED",
        actor: { type: "PIC", id: staff.staffId, name: staff.name },
        message: `${staff.name} menandai kendala selesai: “${blocker.text.slice(0, 120)}”.`,
      }),
    }),
  ]);
}

/* ─── struktur checklist (owner) ─── */

async function withLockedMilestone<T>(
  milestoneId: string,
  fn: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], m: { id: string; workstreamId: string; title: string; status: string }) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const m = await lockMilestone(tx, milestoneId);
    if (isStructureLocked(m.status)) {
      err(
        "Checklist terkunci karena milestone sedang menunggu validasi atau sudah disetujui.",
        "MILESTONE_LOCKED",
        409,
      );
    }
    return fn(tx, m);
  });
}

export async function addMilestoneStep(
  milestoneId: string,
  input: { item_text: string; is_required?: boolean; requires_evidence?: boolean },
  actor: Actor,
): Promise<ProjectMilestoneStepDto> {
  const text = input.item_text.trim().slice(0, 500);
  if (!text) err("Langkah checklist wajib diisi", "STEP_TEXT_REQUIRED", 422);
  return withLockedMilestone(milestoneId, async (tx, m) => {
    const last = await tx.projectMilestoneStep.findFirst({
      where: { milestoneId },
      orderBy: { sortOrder: "desc" },
    });
    const row = await tx.projectMilestoneStep.create({
      data: {
        milestoneId,
        itemText: text,
        isRequired: input.is_required !== false,
        requiresEvidence: Boolean(input.requires_evidence),
        sortOrder: (last?.sortOrder || 0) + 10,
      },
    });
    const ws = await tx.projectWorkstream.findUnique({ where: { id: m.workstreamId } });
    if (ws) {
      await tx.projectActivity.create({
        data: activityData({
          projectId: ws.projectId,
          workstreamId: ws.id,
          milestoneId,
          action: "STEP_CREATED",
          actor,
          message: `Langkah “${text}” ditambahkan ke milestone “${m.title}”.`,
        }),
      });
    }
    return stepDto(row);
  });
}

export async function updateMilestoneStep(
  stepId: string,
  patch: Partial<{
    item_text: string;
    is_required: boolean;
    requires_evidence: boolean;
    move: "up" | "down";
  }>,
): Promise<ProjectMilestoneStepDto> {
  const step = await prisma.projectMilestoneStep.findUnique({ where: { id: stepId } });
  if (!step) err("Langkah tidak ditemukan", "STEP_NOT_FOUND", 404);
  return withLockedMilestone(step.milestoneId, async (tx) => {
    const current = await tx.projectMilestoneStep.findUnique({ where: { id: stepId } });
    if (!current) err("Langkah tidak ditemukan", "STEP_NOT_FOUND", 404);
    if (patch.move) {
      const siblings = await tx.projectMilestoneStep.findMany({
        where: { milestoneId: current.milestoneId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      const idx = siblings.findIndex((s) => s.id === stepId);
      const other = siblings[patch.move === "up" ? idx - 1 : idx + 1];
      if (other) {
        // Tulis ulang urutan 10,20,30… agar tukar posisi selalu konsisten walau sortOrder ada yang sama.
        const order = siblings.map((s) => s.id);
        const j = order.indexOf(other.id);
        [order[idx], order[j]] = [order[j], order[idx]];
        for (let i = 0; i < order.length; i += 1) {
          await tx.projectMilestoneStep.update({ where: { id: order[i] }, data: { sortOrder: (i + 1) * 10 } });
        }
      }
    }
    const text = patch.item_text?.trim().slice(0, 500);
    if (patch.item_text !== undefined && !text) err("Langkah checklist wajib diisi", "STEP_TEXT_REQUIRED", 422);
    const row = await tx.projectMilestoneStep.update({
      where: { id: stepId },
      data: {
        ...(text ? { itemText: text } : {}),
        ...(patch.is_required !== undefined ? { isRequired: patch.is_required } : {}),
        ...(patch.requires_evidence !== undefined ? { requiresEvidence: patch.requires_evidence } : {}),
      },
    });
    return stepDto(row);
  });
}

export async function deleteMilestoneStep(stepId: string, actor: Actor): Promise<void> {
  const step = await prisma.projectMilestoneStep.findUnique({ where: { id: stepId } });
  if (!step) return;
  await withLockedMilestone(step.milestoneId, async (tx, m) => {
    await tx.projectMilestoneStep.deleteMany({ where: { id: stepId } });
    const ws = await tx.projectWorkstream.findUnique({ where: { id: m.workstreamId } });
    if (ws) {
      await tx.projectActivity.create({
        data: activityData({
          projectId: ws.projectId,
          workstreamId: ws.id,
          milestoneId: m.id,
          action: "STEP_DELETED",
          actor,
          message: `Langkah “${step.itemText}” dihapus dari milestone “${m.title}”.`,
        }),
      });
    }
  });
}

/* ─── review (owner/leader) ─── */

export async function reviewProjectMilestone(
  milestoneId: string,
  input: { decision: "APPROVED" | "REVISION"; note?: string | null },
  actor: Actor,
): Promise<void> {
  const note = input.note?.trim() || null;
  if (input.decision === "REVISION" && !note) {
    err("Catatan revisi wajib diisi", "REVISION_NOTE_REQUIRED", 422);
  }

  await prisma.$transaction(async (tx) => {
    const milestone = await lockMilestone(tx, milestoneId);
    if (milestone.status !== "WAITING_VALIDATION") {
      err(
        "Milestone ini tidak sedang menunggu validasi (mungkin sudah diproses). Muat ulang halaman.",
        "NOT_WAITING_VALIDATION",
        409,
      );
    }
    const review = await tx.projectMilestoneReview.findFirst({
      where: { milestoneId, status: "PENDING" },
      orderBy: { submittedAt: "desc" },
    });
    if (!review) err("Tidak ada pengajuan validasi yang menunggu", "NO_PENDING_REVIEW", 409);

    await tx.projectMilestoneReview.update({
      where: { id: review.id },
      data: {
        status: input.decision,
        reviewedBy: actor.id || null,
        reviewedByName: actor.name || null,
        reviewedAt: new Date(),
        reviewNote: note,
      },
    });
    await tx.projectMilestone.update({
      where: { id: milestoneId },
      data:
        input.decision === "APPROVED"
          ? { status: "DONE", completedAt: new Date() }
          : { status: "REVISION", completedAt: null },
    });
    const ws = await tx.projectWorkstream.findUnique({ where: { id: milestone.workstreamId } });
    if (ws) {
      await tx.projectActivity.create({
        data: activityData({
          projectId: ws.projectId,
          workstreamId: ws.id,
          milestoneId,
          action: input.decision === "APPROVED" ? "MILESTONE_APPROVED" : "REVISION_REQUESTED",
          actor,
          message:
            input.decision === "APPROVED"
              ? `${actor.name || "Owner"} menyetujui milestone “${milestone.title}”.`
              : `${actor.name || "Owner"} meminta revisi milestone “${milestone.title}”: ${note}`,
        }),
      });
    }
  });
}

export function absoluteProjectPicLink(shortCode: string): string {
  const origin = getAppOrigin();
  const path = `/p/${shortCode}`;
  return origin ? `${origin}${path}` : path;
}

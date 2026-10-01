import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { ProjectError } from "@/lib/project-errors";
import {
  getTemplate,
  type ProjectStructure,
} from "@/lib/project-templates";
import { activityData, type Actor } from "@/lib/services/project-activity.service";
import { createProject, getProject } from "@/lib/services/project.service";
import type { ProjectDetailDto } from "@/lib/project-types";

function slug(value: string) {
  return (
    value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "project"
  );
}

/** Tulis struktur (bagian → milestone → langkah) ke project dalam satu transaksi. */
async function applyStructure(projectId: string, structure: ProjectStructure, actor: Actor, message: string) {
  await prisma.$transaction(async (tx) => {
    let wsOrder = 0;
    for (const ws of structure.workstreams) {
      wsOrder += 10;
      const w = await tx.projectWorkstream.create({
        data: { projectId, name: ws.name, weight: ws.weight ?? 1, sortOrder: wsOrder },
      });
      let mOrder = 0;
      for (const m of ws.milestones) {
        mOrder += 10;
        const ms = await tx.projectMilestone.create({
          data: { workstreamId: w.id, title: m.title, description: m.description ?? null, weight: m.weight ?? 1, sortOrder: mOrder },
        });
        if (m.steps.length) {
          await tx.projectMilestoneStep.createMany({
            data: m.steps.map((st, i) => ({
              milestoneId: ms.id,
              itemText: st.text,
              isRequired: st.required !== false,
              requiresEvidence: Boolean(st.evidence),
              sortOrder: (i + 1) * 10,
            })),
          });
        }
      }
    }
    await tx.projectActivity.create({
      data: activityData({ projectId, action: "STRUCTURE_APPLIED", actor, message }),
    });
  });
}

export async function createProjectFromTemplate(
  templateId: string,
  input: { name: string; goal?: string | null; lead_staff_id?: string | null; deadline?: string | null },
  actor: Actor,
): Promise<ProjectDetailDto> {
  const template = getTemplate(templateId);
  if (!template) throw new ProjectError("Template tidak ditemukan", "TEMPLATE_NOT_FOUND", 404);
  const project = await createProject(input, actor);
  await applyStructure(project.id, template.structure, actor, `Struktur dari template “${template.name}” diterapkan.`);
  return (await getProject(project.id))!;
}

/** Duplikasi: bagian, milestone, langkah. TIDAK menyalin PIC, tanggal, bukti, catatan, pengajuan, progress. */
export async function duplicateProject(
  sourceId: string,
  input: { name?: string },
  actor: Actor,
): Promise<ProjectDetailDto> {
  const source = await prisma.project.findUnique({ where: { id: sourceId } });
  if (!source) throw new ProjectError("Project tidak ditemukan", "PROJECT_NOT_FOUND", 404);
  const workstreams = await prisma.projectWorkstream.findMany({
    where: { projectId: sourceId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const structure: ProjectStructure = { workstreams: [] };
  for (const ws of workstreams) {
    const milestones = await prisma.projectMilestone.findMany({
      where: { workstreamId: ws.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    const out = [];
    for (const m of milestones) {
      const steps = await prisma.projectMilestoneStep.findMany({
        where: { milestoneId: m.id },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      out.push({
        title: m.title,
        description: m.description ?? undefined,
        weight: m.weight,
        steps: steps.map((s) => ({ text: s.itemText, required: s.isRequired, evidence: s.requiresEvidence })),
      });
    }
    structure.workstreams.push({ name: ws.name, weight: ws.weight, milestones: out });
  }

  const name = (input.name?.trim() || `${source.name} (salinan)`).slice(0, 200);
  const created = await prisma.project.create({
    data: { projectKey: `${slug(name)}-${randomUUID().slice(0, 6)}`, name, goal: source.goal, createdBy: actor.name || null },
  });
  await prisma.projectActivity.create({
    data: activityData({ projectId: created.id, action: "PROJECT_CREATED", actor, message: `Project “${name}” dibuat sebagai salinan dari “${source.name}”.` }),
  });
  await applyStructure(created.id, structure, actor, "Struktur disalin (tanpa PIC, bukti, dan progress).");
  return (await getProject(created.id))!;
}

/* ─── Link ke Task existing (opsional, tidak mengubah flow Task) ─── */

export type LinkedTaskDto = {
  link_id: string;
  task_id: string;
  title: string;
  status: string;
  staff_name: string | null;
  deadline: string | null;
  milestone_id: string | null;
  workstream_id: string | null;
};

export async function linkTask(
  projectId: string,
  input: { task_id: string; milestone_id?: string | null },
  actor: Actor,
): Promise<void> {
  const taskId = input.task_id.trim();
  const [project, task] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { id: true } }),
    prisma.task.findUnique({ where: { taskId }, select: { taskId: true, taskTitle: true } }),
  ]);
  if (!project) throw new ProjectError("Project tidak ditemukan", "PROJECT_NOT_FOUND", 404);
  if (!task) throw new ProjectError(`Task ${taskId} tidak ditemukan`, "TASK_NOT_FOUND", 404);

  let workstreamId: string | null = null;
  let milestoneId: string | null = null;
  if (input.milestone_id) {
    const m = await prisma.projectMilestone.findUnique({ where: { id: input.milestone_id } });
    const ws = m ? await prisma.projectWorkstream.findUnique({ where: { id: m.workstreamId } }) : null;
    if (!m || !ws || ws.projectId !== projectId) {
      throw new ProjectError("Milestone bukan bagian dari project ini", "MILESTONE_MISMATCH", 422);
    }
    workstreamId = ws.id;
    milestoneId = m.id;
  }
  const existing = await prisma.projectTaskLink.findUnique({
    where: { projectId_taskId: { projectId, taskId } },
  });
  if (existing) throw new ProjectError("Task ini sudah terhubung ke project", "TASK_ALREADY_LINKED", 409);

  await prisma.$transaction([
    prisma.projectTaskLink.create({ data: { projectId, taskId, workstreamId, milestoneId } }),
    prisma.projectActivity.create({
      data: activityData({ projectId, workstreamId, milestoneId, action: "TASK_LINKED", actor, message: `Task “${task.taskTitle.slice(0, 120)}” (${taskId}) dihubungkan ke project.` }),
    }),
  ]);
}

export async function unlinkTask(projectId: string, linkId: string, actor: Actor): Promise<void> {
  const link = await prisma.projectTaskLink.findUnique({ where: { id: linkId } });
  if (!link || link.projectId !== projectId) return;
  await prisma.$transaction([
    prisma.projectTaskLink.delete({ where: { id: linkId } }),
    prisma.projectActivity.create({
      data: activityData({ projectId, action: "TASK_UNLINKED", actor, message: `Task ${link.taskId} dilepas dari project.` }),
    }),
  ]);
}

export async function listLinkedTasks(projectId: string): Promise<LinkedTaskDto[]> {
  const links = await prisma.projectTaskLink.findMany({ where: { projectId }, orderBy: { createdAt: "desc" } });
  if (!links.length) return [];
  const tasks = await prisma.task.findMany({
    where: { taskId: { in: links.map((l) => l.taskId) } },
    select: { taskId: true, taskTitle: true, status: true, picName: true, deadline: true },
  });
  const byId = new Map(tasks.map((t) => [t.taskId, t]));
  return links.map((l) => {
    const t = byId.get(l.taskId);
    return {
      link_id: l.id,
      task_id: l.taskId,
      title: t?.taskTitle ?? l.taskId,
      status: t?.status ?? "UNKNOWN",
      staff_name: t?.picName ?? null,
      deadline: t?.deadline ? t.deadline.toISOString() : null,
      milestone_id: l.milestoneId,
      workstream_id: l.workstreamId,
    };
  });
}

/** Badge kecil "nama project" untuk daftar task staff (tanpa menambah field ke Task). */
export async function projectBadgesForTasks(taskIds: string[]): Promise<Map<string, string>> {
  if (!taskIds.length) return new Map();
  const links = await prisma.projectTaskLink.findMany({ where: { taskId: { in: taskIds } } });
  if (!links.length) return new Map();
  const projects = await prisma.project.findMany({
    where: { id: { in: [...new Set(links.map((l) => l.projectId))] } },
    select: { id: true, name: true },
  });
  const names = new Map(projects.map((p) => [p.id, p.name]));
  const out = new Map<string, string>();
  for (const l of links) {
    const name = names.get(l.projectId);
    if (name && !out.has(l.taskId)) out.set(l.taskId, name);
  }
  return out;
}

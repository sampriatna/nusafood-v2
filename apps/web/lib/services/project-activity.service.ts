import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { ProjectActivityDto } from "@/lib/project-types";

export type Actor = {
  type: "PIC" | "OWNER" | "SYSTEM";
  id?: string | null;
  name?: string | null;
};

export type ActivityInput = {
  projectId: string;
  workstreamId?: string | null;
  milestoneId?: string | null;
  action: string;
  actor: Actor;
  message: string;
};

/** Bentuk create untuk dipakai di dalam $transaction supaya audit selalu ikut tersimpan. */
export function activityData(input: ActivityInput): Prisma.ProjectActivityUncheckedCreateInput {
  return {
    projectId: input.projectId,
    workstreamId: input.workstreamId ?? null,
    milestoneId: input.milestoneId ?? null,
    action: input.action,
    actorType: input.actor.type,
    actorId: input.actor.id ?? null,
    actorName: input.actor.name ?? null,
    message: input.message.slice(0, 1000),
  };
}

export async function logActivity(input: ActivityInput): Promise<void> {
  await prisma.projectActivity.create({ data: activityData(input) });
}

export async function listActivity(projectId: string, limit = 60): Promise<ProjectActivityDto[]> {
  const rows = await prisma.projectActivity.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    actor_type: row.actorType as ProjectActivityDto["actor_type"],
    actor_name: row.actorName,
    message: row.message,
    milestone_id: row.milestoneId,
    created_at: row.createdAt.toISOString(),
  }));
}

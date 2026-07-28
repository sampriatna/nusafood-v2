import type { Prisma } from "@nusafood/database";
import { prisma } from "@/lib/db";
import {
  LEADER_MONITOR_SEED_TEMPLATES,
  photoModeToDb,
} from "@/lib/leader-monitoring-seed-data";

/** Idempotent seed — upsert templates by kind when DB empty or outdated count. */
export async function ensureLeaderMonitorTemplatesSeeded(): Promise<number> {
  let upserted = 0;

  for (const def of LEADER_MONITOR_SEED_TEMPLATES) {
    const data = {
      kind: def.kind,
      title: def.title,
      menuLabel: def.menu_label,
      description: def.description,
      standardResult: def.standard_result,
      outletCode: def.outlet_id,
      targetTimeStart: def.target_time_start ?? null,
      targetTimeEnd: def.target_time_end ?? null,
      photoMode: photoModeToDb(def.photo_mode),
      checklist: def.checklist as unknown as Prisma.InputJsonValue,
      active: def.active,
      sortOrder: def.sort_order,
    };

    const existing = await prisma.leaderMonitorTemplate.findFirst({
      where: { kind: def.kind },
      select: { id: true },
    });

    if (existing) {
      await prisma.leaderMonitorTemplate.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.leaderMonitorTemplate.create({ data });
    }
    upserted += 1;
  }

  return upserted;
}

export async function isLeaderMonitorSeeded(): Promise<boolean> {
  const count = await prisma.leaderMonitorTemplate.count({
    where: { active: true },
  });
  return count >= LEADER_MONITOR_SEED_TEMPLATES.length;
}

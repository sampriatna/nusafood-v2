import { prisma } from "@/lib/db";
import {
  isPositionGroup,
  resolveStaffPositionGroup,
} from "@/lib/position-groups";
import { ensureStaffJobTables } from "@/lib/services/staff-job-profile.service";

/**
 * PIC tugas berulang berdasarkan posisi (mis. "Kasir").
 * Siapa orangnya diambil dari "Posisi Kerja Hari Ini" (staff_daily_duties);
 * tanpa jadwal di tanggal itu → staff dengan jabatan utama tersebut.
 */

export type PicCandidate = {
  staff_id: string;
  name: string;
  wa_number: string;
  /** true = ditugaskan eksplisit lewat Posisi Kerja pada tanggal itu */
  scheduled: boolean;
};

let tableReady = false;

export async function ensureRecurringPicTable(): Promise<void> {
  if (tableReady) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "recurring_template_pic_rules" (
      "template_id" VARCHAR(50) PRIMARY KEY REFERENCES "recurring_templates"("template_id") ON DELETE CASCADE,
      "pic_position" VARCHAR(100) NOT NULL,
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  tableReady = true;
}

export function normalizePicPosition(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const group = resolveStaffPositionGroup(raw);
  return group && isPositionGroup(group) ? group : null;
}

export async function getPicPositions(
  templateIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!templateIds.length) return map;
  await ensureRecurringPicTable();
  const rows = await prisma.$queryRaw<{ template_id: string; pic_position: string }[]>`
    SELECT "template_id", "pic_position"
    FROM "recurring_template_pic_rules"
    WHERE "template_id" = ANY(${templateIds})
  `;
  for (const row of rows) map.set(row.template_id, row.pic_position);
  return map;
}

export async function setPicPosition(
  templateId: string,
  position: string | null,
): Promise<void> {
  await ensureRecurringPicTable();
  if (!position) {
    await prisma.$executeRaw`
      DELETE FROM "recurring_template_pic_rules" WHERE "template_id" = ${templateId}
    `;
    return;
  }
  await prisma.$executeRaw`
    INSERT INTO "recurring_template_pic_rules" ("template_id", "pic_position", "updated_at")
    VALUES (${templateId}, ${position}, NOW())
    ON CONFLICT ("template_id")
    DO UPDATE SET "pic_position" = EXCLUDED."pic_position", "updated_at" = NOW()
  `;
}

function parsePositions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((v): string => resolveStaffPositionGroup(String(v)))
      .filter((g) => Boolean(g) && isPositionGroup(g));
  } catch {
    return [];
  }
}

/** Pure: pilih kandidat dari data staff + jadwal (mudah dites). */
export function pickCandidates(
  position: string,
  staff: { staffId: string; name: string; waNumber: string; position: string | null }[],
  duties: Map<string, string[]>,
  secondary: Map<string, string[]>,
): PicCandidate[] {
  const scheduled: PicCandidate[] = [];
  const fallback: PicCandidate[] = [];

  for (const s of staff) {
    const primary: string = resolveStaffPositionGroup(s.position ?? "");
    const duty = duties.get(s.staffId);
    const candidate = { staff_id: s.staffId, name: s.name, wa_number: s.waNumber };

    if (duty) {
      const allowed = new Set([primary, ...(secondary.get(s.staffId) ?? [])]);
      const active = duty.filter((p) => allowed.has(p));
      const effective = active.length ? active : [primary];
      if (effective.includes(position)) scheduled.push({ ...candidate, scheduled: true });
    } else if (primary === position) {
      fallback.push({ ...candidate, scheduled: false });
    }
  }

  // Yang dijadwalkan eksplisit hari itu diutamakan.
  return scheduled.length ? scheduled : fallback;
}

/** Siapa yang bertugas di posisi ini pada tanggal (YYYY-MM-DD, WIB) di outlet tsb. */
export async function resolvePicCandidates(
  outletId: string,
  position: string,
  dateKey: string,
): Promise<PicCandidate[]> {
  const staff = await prisma.staff.findMany({
    where: { outletId, status: "ACTIVE" },
    select: { staffId: true, name: true, waNumber: true, position: true },
    orderBy: { name: "asc" },
  });
  if (!staff.length) return [];

  await ensureStaffJobTables();
  const ids = staff.map((s) => s.staffId);
  const [dutyRows, profileRows] = await Promise.all([
    prisma.$queryRaw<{ staff_id: string; active_positions: string | null }[]>`
      SELECT "staff_id", "active_positions"
      FROM "staff_daily_duties"
      WHERE "staff_id" = ANY(${ids}) AND "duty_date" = CAST(${dateKey} AS DATE)
    `,
    prisma.$queryRaw<{ staff_id: string; secondary_positions: string | null }[]>`
      SELECT "staff_id", "secondary_positions"
      FROM "staff_job_profiles"
      WHERE "staff_id" = ANY(${ids})
    `,
  ]);

  const duties = new Map(dutyRows.map((r) => [r.staff_id, parsePositions(r.active_positions)]));
  const secondary = new Map(
    profileRows.map((r) => [r.staff_id, parsePositions(r.secondary_positions)]),
  );
  return pickCandidates(position, staff, duties, secondary);
}

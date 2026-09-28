import { prisma } from "@/lib/db";
import {
  normalizeWorkShiftCode,
  shiftCodesForOutlet,
  type WorkShiftCode,
} from "@/lib/daily-activity-sop";
import {
  addDaysToDateKey,
  weekRangeKeysInAppTz,
} from "@/lib/format-datetime";
import {
  POSITION_GROUP_LABELS,
  REPORT_POSITION_GROUPS,
  isPositionGroup,
  resolveStaffPositionGroup,
  type ReportPositionGroup,
} from "@/lib/position-groups";
import { ensureRecurringPicTable } from "@/lib/services/recurring-pic.service";
import { ensureStaffJobTables } from "@/lib/services/staff-job-profile.service";

/**
 * Jadwal posisi mingguan: per tanggal, per posisi → siapa yang bertugas.
 * Shift Waiter juga ditetapkan leader/admin di jadwal yang sama sehingga
 * staff tidak menentukan sendiri SOP mana yang menjadi kewajibannya.
 */

export type RosterCells = Record<string, Record<string, string>>; // date → position → staff_id
export type ShiftCells = Record<string, Record<string, WorkShiftCode>>; // date → staff_id → shift

export type WeeklyRoster = {
  outlet: { id: string; code: string; name: string };
  week_start: string;
  dates: string[];
  positions: {
    position: string;
    label: string;
    /** dipakai sebagai PIC di template tugas berulang outlet ini */
    used_by_templates: boolean;
    staff: { staff_id: string; name: string }[];
  }[];
  cells: RosterCells;
  shift_cells: ShiftCells;
  /** Kode shift outlet ini (KBU 1K/2K/3K, Kisamen 1R/2R, Samtaro 1S). */
  shift_options: WorkShiftCode[];
};

export class RosterError extends Error {
  constructor(
    message: string,
    public code = "VALIDATION",
    public status = 422,
  ) {
    super(message);
  }
}

function parseList(raw: string | null | undefined): string[] {
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

export function weekDates(weekStart?: string): string[] {
  const start = weekRangeKeysInAppTz(
    weekStart ? new Date(`${weekStart}T12:00:00+07:00`) : new Date(),
  ).start;
  return Array.from({ length: 7 }, (_, i) => addDaysToDateKey(start, i));
}

async function loadOutletStaff(outletCode: string) {
  const outlet = await prisma.outlet.findUnique({
    where: { code: outletCode },
    select: { id: true, code: true, name: true },
  });
  if (!outlet) throw new RosterError("Outlet tidak ditemukan", "NOT_FOUND", 404);

  const staff = await prisma.staff.findMany({
    where: { outletId: outlet.id, status: "ACTIVE" },
    select: { staffId: true, name: true, position: true },
    orderBy: { name: "asc" },
  });

  await ensureStaffJobTables();
  const ids = staff.map((s) => s.staffId);
  const profiles = ids.length
    ? await prisma.$queryRaw<
        { staff_id: string; secondary_positions: string | null }[]
      >`
        SELECT "staff_id", "secondary_positions" FROM "staff_job_profiles"
        WHERE "staff_id" = ANY(${ids})
      `
    : [];
  const secondary = new Map(
    profiles.map((p) => [p.staff_id, parseList(p.secondary_positions)]),
  );

  const qualified = new Map<string, Set<string>>(); // staff → positions
  for (const s of staff) {
    const primary: string = resolveStaffPositionGroup(s.position ?? "");
    qualified.set(
      s.staffId,
      new Set([primary, ...(secondary.get(s.staffId) ?? [])].filter(Boolean)),
    );
  }
  return { outlet, staff, qualified };
}

export async function getWeeklyRoster(
  outletCode: string,
  weekStart?: string,
): Promise<WeeklyRoster> {
  const { outlet, staff, qualified } = await loadOutletStaff(outletCode);
  const dates = weekDates(weekStart);
  const ids = staff.map((s) => s.staffId);

  await ensureRecurringPicTable();
  const [duties, templatePositions] = await Promise.all([
    ids.length
      ? prisma.$queryRaw<
          {
            staff_id: string;
            duty_date: string;
            active_positions: string | null;
            shift_code: string | null;
          }[]
        >`
          SELECT
            "staff_id",
            "duty_date"::text AS "duty_date",
            "active_positions",
            "shift_code"
          FROM "staff_daily_duties"
          WHERE "staff_id" = ANY(${ids})
            AND "duty_date" BETWEEN CAST(${dates[0]} AS DATE) AND CAST(${dates[6]} AS DATE)
        `
      : Promise.resolve([]),
    prisma.$queryRaw<{ pic_position: string }[]>`
      SELECT DISTINCT r."pic_position"
      FROM "recurring_template_pic_rules" r
      JOIN "recurring_templates" t ON t."template_id" = r."template_id"
      WHERE t."outlet_id" = CAST(${outlet.id} AS UUID) AND t."active_status" = TRUE
    `,
  ]);

  const used = new Set(templatePositions.map((r) => r.pic_position));
  const positions = (REPORT_POSITION_GROUPS as readonly ReportPositionGroup[])
    .map((position) => ({
      position,
      label: POSITION_GROUP_LABELS[position],
      used_by_templates: used.has(position),
      staff: staff
        .filter((s) => qualified.get(s.staffId)?.has(position))
        .map((s) => ({ staff_id: s.staffId, name: s.name })),
    }))
    .filter((p) => p.staff.length > 0 || p.used_by_templates)
    .sort((a, b) => Number(b.used_by_templates) - Number(a.used_by_templates));

  const cells: RosterCells = Object.fromEntries(dates.map((d) => [d, {}]));
  const shiftCells: ShiftCells = Object.fromEntries(dates.map((d) => [d, {}]));
  for (const row of duties) {
    const day = cells[row.duty_date];
    if (!day) continue;
    for (const position of parseList(row.active_positions)) {
      day[position] ??= row.staff_id;
    }
    const shift = normalizeWorkShiftCode(row.shift_code);
    if (shift && qualified.get(row.staff_id)?.has("Waiters")) {
      shiftCells[row.duty_date]![row.staff_id] = shift;
    }
  }

  return {
    outlet,
    week_start: dates[0],
    dates,
    positions,
    cells,
    shift_cells: shiftCells,
    shift_options: shiftCodesForOutlet(outlet.code),
  };
}

/** Hitung isi staff_daily_duties per tanggal dari grid (pure → mudah dites). */
export function buildDutyRows(
  dates: string[],
  cells: RosterCells,
  qualified: Map<string, Set<string>>,
): Map<string, Map<string, string[]>> {
  const result = new Map<string, Map<string, string[]>>();
  for (const date of dates) {
    const perStaff = new Map<string, string[]>();
    for (const [position, staffId] of Object.entries(cells[date] ?? {})) {
      if (!staffId) continue;
      if (!qualified.get(staffId)?.has(position)) {
        throw new RosterError(`Staff tidak punya jabatan ${position}`);
      }
      const list = perStaff.get(staffId) ?? [];
      if (!list.includes(position)) list.push(position);
      if (list.length > 3) {
        throw new RosterError("Maksimal 3 posisi per staff dalam satu hari");
      }
      perStaff.set(staffId, list);
    }
    result.set(date, perStaff);
  }
  return result;
}

export function buildShiftRows(
  dates: string[],
  shiftCells: ShiftCells,
  qualified: Map<string, Set<string>>,
  allowedShifts: readonly WorkShiftCode[] = shiftCodesForOutlet(null),
): Map<string, Map<string, WorkShiftCode>> {
  const result = new Map<string, Map<string, WorkShiftCode>>();
  for (const date of dates) {
    const perStaff = new Map<string, WorkShiftCode>();
    for (const [staffId, rawShift] of Object.entries(shiftCells[date] ?? {})) {
      if (!qualified.get(staffId)?.has("Waiters")) {
        throw new RosterError("Shift waiter hanya boleh diberikan kepada staff yang bertugas sebagai Waiter");
      }
      const shift = normalizeWorkShiftCode(rawShift);
      if (!shift || !allowedShifts.includes(shift)) {
        throw new RosterError(`Shift waiter outlet ini harus ${allowedShifts.join(" / ")}`);
      }
      perStaff.set(staffId, shift);
    }
    result.set(date, perStaff);
  }
  return result;
}

/**
 * Simpan posisi + shift seminggu. Leader/admin menjadi source of truth shift,
 * sehingga staff tidak bisa memilih SOP yang lebih ringan untuk dirinya sendiri.
 * Client lama yang belum mengirim shift_cells tidak boleh menghapus shift existing.
 */
export async function saveWeeklyRoster(input: {
  outletCode: string;
  weekStart: string;
  cells: RosterCells;
  shiftCells?: ShiftCells;
  actor?: string;
}): Promise<WeeklyRoster> {
  const { outlet, staff, qualified } = await loadOutletStaff(input.outletCode);
  const dates = weekDates(input.weekStart);
  const rows = buildDutyRows(dates, input.cells, qualified);
  const shouldUpdateShifts = input.shiftCells !== undefined;
  const shiftRows: Map<string, Map<string, WorkShiftCode>> = shouldUpdateShifts
    ? buildShiftRows(dates, input.shiftCells ?? {}, qualified, shiftCodesForOutlet(outlet.code))
    : new Map();
  const ids = staff.map((s) => s.staffId);
  const waiterIds = staff
    .filter((s) => qualified.get(s.staffId)?.has("Waiters"))
    .map((s) => s.staffId);

  await prisma.$transaction(async (tx) => {
    if (ids.length) {
      await tx.$executeRaw`
        UPDATE "staff_daily_duties"
        SET "active_positions" = '[]',
            "updated_by" = ${input.actor ?? null},
            "updated_at" = NOW()
        WHERE "staff_id" = ANY(${ids})
          AND "duty_date" BETWEEN CAST(${dates[0]} AS DATE) AND CAST(${dates[6]} AS DATE)
      `;
    }

    if (waiterIds.length && shouldUpdateShifts) {
      await tx.$executeRaw`
        UPDATE "staff_daily_duties"
        SET "shift_code" = NULL,
            "updated_by" = ${input.actor ?? null},
            "updated_at" = NOW()
        WHERE "staff_id" = ANY(${waiterIds})
          AND "duty_date" BETWEEN CAST(${dates[0]} AS DATE) AND CAST(${dates[6]} AS DATE)
      `;
    }

    for (const [date, perStaff] of rows) {
      for (const [staffId, positions] of perStaff) {
        await tx.$executeRaw`
          INSERT INTO "staff_daily_duties"
            ("staff_id", "duty_date", "active_positions", "updated_by", "created_at", "updated_at")
          VALUES
            (${staffId}, CAST(${date} AS DATE), ${JSON.stringify(positions)}, ${input.actor ?? null}, NOW(), NOW())
          ON CONFLICT ("staff_id", "duty_date") DO UPDATE SET
            "active_positions" = EXCLUDED."active_positions",
            "updated_by" = EXCLUDED."updated_by",
            "updated_at" = NOW()
        `;
      }
    }

    for (const [date, perStaff] of shiftRows) {
      for (const [staffId, shift] of perStaff) {
        await tx.$executeRaw`
          INSERT INTO "staff_daily_duties"
            ("staff_id", "duty_date", "active_positions", "shift_code", "updated_by", "created_at", "updated_at")
          VALUES
            (${staffId}, CAST(${date} AS DATE), '[]', ${shift}, ${input.actor ?? null}, NOW(), NOW())
          ON CONFLICT ("staff_id", "duty_date") DO UPDATE SET
            "shift_code" = EXCLUDED."shift_code",
            "updated_by" = EXCLUDED."updated_by",
            "updated_at" = NOW()
        `;
      }
    }

    if (ids.length) {
      await tx.$executeRaw`
        DELETE FROM "staff_daily_duties"
        WHERE "staff_id" = ANY(${ids})
          AND "duty_date" BETWEEN CAST(${dates[0]} AS DATE) AND CAST(${dates[6]} AS DATE)
          AND "active_positions" = '[]'
          AND "shift_code" IS NULL
      `;
    }
  });

  return getWeeklyRoster(input.outletCode, dates[0]);
}

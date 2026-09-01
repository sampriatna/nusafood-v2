import { prisma } from "@/lib/db";
import { todayKeyInAppTz } from "@/lib/format-datetime";
import {
  getPositionGroupLabel,
  isPositionGroup,
  resolveStaffPositionGroup,
} from "@/lib/position-groups";

export class StaffJobError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = "VALIDATION_ERROR", status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export type StaffJobSetting = {
  staff_id: string;
  secondary_positions: string[];
  active_positions: string[];
  active_date: string | null;
};

type ProfileRow = {
  staff_id: string;
  secondary_positions: string | null;
};

type DutyRow = {
  staff_id: string;
  duty_date: string;
  active_positions: string | null;
};

let tablesReady = false;

/**
 * Idempotent bootstrap supaya fitur tetap bisa live walau migration belum dijalankan manual.
 * Migration tetap disimpan di repo sebagai source of truth.
 */
export async function ensureStaffJobTables(): Promise<void> {
  if (tablesReady) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "staff_job_profiles" (
      "staff_id" VARCHAR(50) PRIMARY KEY REFERENCES "staff"("staff_id") ON DELETE CASCADE,
      "secondary_positions" TEXT NOT NULL DEFAULT '[]',
      "updated_by" VARCHAR(200),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "staff_daily_duties" (
      "id" BIGSERIAL PRIMARY KEY,
      "staff_id" VARCHAR(50) NOT NULL REFERENCES "staff"("staff_id") ON DELETE CASCADE,
      "duty_date" DATE NOT NULL,
      "active_positions" TEXT NOT NULL DEFAULT '[]',
      "updated_by" VARCHAR(200),
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "staff_daily_duties_staff_date_key" UNIQUE ("staff_id", "duty_date")
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "idx_staff_daily_duties_date"
    ON "staff_daily_duties"("duty_date")
  `);

  tablesReady = true;
}

function parsePositionList(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((value) => resolveStaffPositionGroup(String(value)))
      .filter((value): value is string => Boolean(value) && isPositionGroup(value));
  } catch {
    return [];
  }
}

function normalizePositionList(values: unknown): string[] {
  if (!Array.isArray(values)) {
    throw new StaffJobError("Daftar posisi tidak valid");
  }

  const normalized = values.map((value) => {
    const group = resolveStaffPositionGroup(String(value));
    if (!group || !isPositionGroup(group)) {
      throw new StaffJobError(`Posisi tidak dikenal: ${String(value)}`);
    }
    return group;
  });

  return [...new Set(normalized)];
}

function primaryPosition(position?: string | null): string {
  const primary = resolveStaffPositionGroup(position ?? "");
  if (!primary || !isPositionGroup(primary)) {
    throw new StaffJobError(
      "Jabatan utama staff belum memakai posisi standar",
      "PRIMARY_POSITION_INVALID",
      422,
    );
  }
  return primary;
}

async function getStaffRow(staffId: string) {
  const staff = await prisma.staff.findUnique({
    where: { staffId },
    select: {
      staffId: true,
      name: true,
      position: true,
      outletId: true,
      status: true,
    },
  });
  if (!staff) {
    throw new StaffJobError("Staff tidak ditemukan", "NOT_FOUND", 404);
  }
  return staff;
}

async function getProfileRow(staffId: string): Promise<ProfileRow | null> {
  await ensureStaffJobTables();
  const rows = await prisma.$queryRaw<ProfileRow[]>`
    SELECT "staff_id", "secondary_positions"
    FROM "staff_job_profiles"
    WHERE "staff_id" = ${staffId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function getDutyRow(
  staffId: string,
  date: string,
): Promise<DutyRow | null> {
  await ensureStaffJobTables();
  const rows = await prisma.$queryRaw<DutyRow[]>`
    SELECT
      "staff_id",
      "duty_date"::text AS "duty_date",
      "active_positions"
    FROM "staff_daily_duties"
    WHERE "staff_id" = ${staffId}
      AND "duty_date" = CAST(${date} AS DATE)
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function listStaffJobSettings(
  staffIds: string[],
  date = todayKeyInAppTz(),
): Promise<StaffJobSetting[]> {
  if (!staffIds.length) return [];
  await ensureStaffJobTables();

  const [profiles, duties] = await Promise.all([
    prisma.$queryRaw<ProfileRow[]>`
      SELECT "staff_id", "secondary_positions"
      FROM "staff_job_profiles"
    `,
    prisma.$queryRaw<DutyRow[]>`
      SELECT
        "staff_id",
        "duty_date"::text AS "duty_date",
        "active_positions"
      FROM "staff_daily_duties"
      WHERE "duty_date" = CAST(${date} AS DATE)
    `,
  ]);

  const wanted = new Set(staffIds);
  const profileMap = new Map(
    profiles
      .filter((row) => wanted.has(row.staff_id))
      .map((row) => [row.staff_id, parsePositionList(row.secondary_positions)]),
  );
  const dutyMap = new Map(
    duties
      .filter((row) => wanted.has(row.staff_id))
      .map((row) => [row.staff_id, row]),
  );

  return staffIds.map((staffId) => {
    const duty = dutyMap.get(staffId);
    return {
      staff_id: staffId,
      secondary_positions: profileMap.get(staffId) ?? [],
      active_positions: duty ? parsePositionList(duty.active_positions) : [],
      active_date: duty?.duty_date ?? null,
    };
  });
}

export async function updateStaffSecondaryPositions(input: {
  staffId: string;
  positions: unknown;
  actor?: string;
}): Promise<StaffJobSetting> {
  await ensureStaffJobTables();
  const staff = await getStaffRow(input.staffId);
  const primary = primaryPosition(staff.position);
  const secondary = normalizePositionList(input.positions).filter(
    (position) => position !== primary,
  );

  if (secondary.length > 3) {
    throw new StaffJobError("Maksimal 3 jabatan tambahan per staff");
  }

  const json = JSON.stringify(secondary);
  await prisma.$executeRaw`
    INSERT INTO "staff_job_profiles" (
      "staff_id", "secondary_positions", "updated_by", "created_at", "updated_at"
    ) VALUES (
      ${input.staffId}, ${json}, ${input.actor ?? null}, NOW(), NOW()
    )
    ON CONFLICT ("staff_id") DO UPDATE SET
      "secondary_positions" = EXCLUDED."secondary_positions",
      "updated_by" = EXCLUDED."updated_by",
      "updated_at" = NOW()
  `;

  // Bila kompetensi hari ini dicabut, jangan biarkan duty menunjuk posisi yang sudah tidak valid.
  const today = todayKeyInAppTz();
  const currentDuty = await getDutyRow(input.staffId, today);
  if (currentDuty) {
    const allowed = new Set([primary, ...secondary]);
    const active = parsePositionList(currentDuty.active_positions);
    if (!active.length || active.some((position) => !allowed.has(position))) {
      await setStaffActivePositions({
        staffId: input.staffId,
        positions: [primary],
        date: today,
        actor: input.actor,
      });
    }
  }

  const setting = (
    await listStaffJobSettings([input.staffId], today)
  )[0]!;
  return setting;
}

export async function setStaffActivePositions(input: {
  staffId: string;
  positions: unknown;
  date?: string;
  actor?: string;
}): Promise<StaffJobSetting> {
  await ensureStaffJobTables();
  const staff = await getStaffRow(input.staffId);
  if (staff.status !== "ACTIVE") {
    throw new StaffJobError("Staff sedang nonaktif", "STAFF_INACTIVE", 422);
  }

  const primary = primaryPosition(staff.position);
  const profile = await getProfileRow(input.staffId);
  const secondary = parsePositionList(profile?.secondary_positions);
  const allowed = new Set([primary, ...secondary]);
  const active = normalizePositionList(input.positions);

  if (!active.length) {
    throw new StaffJobError("Pilih minimal satu posisi yang bertugas hari ini");
  }
  if (active.length > 3) {
    throw new StaffJobError("Maksimal 3 posisi aktif dalam satu hari");
  }

  const invalid = active.filter((position) => !allowed.has(position));
  if (invalid.length) {
    throw new StaffJobError(
      `Posisi belum terdaftar sebagai kompetensi staff: ${invalid
        .map(getPositionGroupLabel)
        .join(", ")}`,
      "POSITION_NOT_ALLOWED",
      422,
    );
  }

  const date = input.date || todayKeyInAppTz();
  const json = JSON.stringify(active);
  await prisma.$executeRaw`
    INSERT INTO "staff_daily_duties" (
      "staff_id", "duty_date", "active_positions", "updated_by", "created_at", "updated_at"
    ) VALUES (
      ${input.staffId}, CAST(${date} AS DATE), ${json}, ${input.actor ?? null}, NOW(), NOW()
    )
    ON CONFLICT ("staff_id", "duty_date") DO UPDATE SET
      "active_positions" = EXCLUDED."active_positions",
      "updated_by" = EXCLUDED."updated_by",
      "updated_at" = NOW()
  `;

  return (
    await listStaffJobSettings([input.staffId], date)
  )[0]!;
}

/**
 * Posisi efektif untuk tanggal tertentu.
 * Tanpa assignment tanggal itu -> hanya jabatan utama, sehingga kompetensi tambahan tidak otomatis menambah beban.
 */
export async function getEffectiveStaffPositionGroups(
  staffId: string,
  staffPosition: string,
  date = todayKeyInAppTz(),
): Promise<string[]> {
  const primary = primaryPosition(staffPosition);
  await ensureStaffJobTables();

  const [profile, duty] = await Promise.all([
    getProfileRow(staffId),
    getDutyRow(staffId, date),
  ]);
  if (!duty) return [primary];

  const allowed = new Set([
    primary,
    ...parsePositionList(profile?.secondary_positions),
  ]);
  const active = parsePositionList(duty.active_positions).filter((position) =>
    allowed.has(position),
  );

  return active.length ? active : [primary];
}

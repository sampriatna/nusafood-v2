import { prisma } from "@/lib/db";
import {
  normalizeWorkShiftCode,
  shiftHours,
  type WorkShiftCode,
} from "@/lib/daily-activity-sop";
import { addDaysToDateKey, todayKeyInAppTz } from "@/lib/format-datetime";
import { resolveStaffPositionGroup } from "@/lib/position-groups";
import {
  CENTRAL_POSITIONS,
  coordinationRulesFor,
  resolveCoordination,
  type Contact,
  type ContactDirectory,
  type ResolvedRule,
} from "@/lib/sop-coordination";
import { ensureStaffJobTables } from "@/lib/services/staff-job-profile.service";
import { normalizeWa } from "@/lib/wa-message";

export type SopTrackRecord = {
  days: number;
  total: number;
  valid: number;
  revisi: number;
  tidak_valid: number;
  belum_dicek: number;
  /** Temuan leader terbaru (revisi / tidak valid / manipulasi) supaya staff tahu dicek. */
  latest_findings: { date: string; title: string; validation: string; note: string | null; by: string | null }[];
};

export type SopContext = {
  coordination: ResolvedRule[];
  track_record: SopTrackRecord;
};

type DutyRow = { staff_id: string; active_positions: string | null; shift_code: string | null };

function parseList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.map((v) => resolveStaffPositionGroup(String(v))).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

/**
 * Siapa bertugas hari ini per posisi (outlet staff + posisi pusat dari GENERAL),
 * aturan koordinasi untuk posisi staff, handover sesuai shift, dan rekam jejak cek leader.
 */
export async function getSopContext(input: {
  staffId: string;
  outletId: string;
  position: string;
}): Promise<SopContext> {
  const today = todayKeyInAppTz();
  const selfGroup = resolveStaffPositionGroup(input.position) || input.position;

  const general = await prisma.outlet.findFirst({ where: { code: "GENERAL" }, select: { id: true } });
  const outletIds = [input.outletId, ...(general && general.id !== input.outletId ? [general.id] : [])];
  const staff = await prisma.staff.findMany({
    where: { status: "ACTIVE", outletId: { in: outletIds } },
    select: { staffId: true, name: true, position: true, waNumber: true, outletId: true, role: true },
  });

  let duties: DutyRow[] = [];
  try {
    await ensureStaffJobTables();
    duties = staff.length
      ? await prisma.$queryRaw<DutyRow[]>`
          SELECT "staff_id", "active_positions", "shift_code"
          FROM "staff_daily_duties"
          WHERE "duty_date" = CAST(${today} AS DATE)
            AND "staff_id" = ANY(${staff.map((s) => s.staffId)})
        `
      : [];
  } catch (error) {
    console.error("[sop-context duties]", error);
  }
  const dutyMap = new Map(duties.map((d) => [d.staff_id, d]));

  const local: ContactDirectory = {};
  const central: ContactDirectory = {};
  for (const s of staff) {
    const duty = dutyMap.get(s.staffId);
    const scheduled = parseList(duty?.active_positions ?? null);
    const positions: string[] = scheduled.length
      ? scheduled
      : [resolveStaffPositionGroup(s.position ?? "")].filter(Boolean);
    // Jabatan "Leader" / "Kitchen Leader" belum tentu terbaca sebagai LeaderOutlet — role LEADER pasti leader.
    if (s.role === "LEADER" && !positions.includes("LeaderOutlet")) positions.push("LeaderOutlet");
    const wa = normalizeWa(s.waNumber);
    const contact: Contact = {
      staff_id: s.staffId,
      name: s.name,
      wa_link: wa ? `https://wa.me/${wa}` : "",
      shift: normalizeWorkShiftCode(duty?.shift_code) ?? null,
    };
    const target = s.outletId === input.outletId ? local : central;
    for (const position of positions) (target[position] ??= []).push(contact);
  }
  const directory: ContactDirectory = { ...local };
  for (const position of CENTRAL_POSITIONS) {
    if (!directory[position]?.length && central[position]?.length) directory[position] = central[position];
  }

  const coordination = resolveCoordination(coordinationRulesFor(selfGroup), directory, input.staffId);

  // Serah terima: rekan posisi sama yang masih bertugas setelah staff ini pulang.
  const selfShift = normalizeWorkShiftCode(dutyMap.get(input.staffId)?.shift_code);
  const peers = (directory[selfGroup] ?? []).filter((c) => c.staff_id !== input.staffId);
  const endOf = (code?: string | null) =>
    code ? shiftHours(code as WorkShiftCode, today).end : null;
  const selfEnd = endOf(selfShift);
  const handoverTo = selfEnd
    ? peers.filter((c) => {
        const end = endOf(c.shift);
        return end !== null && end > selfEnd;
      })
    : peers;
  if (handoverTo.length) {
    coordination.unshift({
      when: selfShift
        ? `Serah terima sebelum shift ${selfShift} selesai (${selfEnd})`
        : "Serah terima pekerjaan yang belum selesai sebelum pulang",
      to: [selfGroup],
      targets: [{ position: selfGroup, contacts: handoverTo }],
    });
  }

  return { coordination, track_record: await getTrackRecord(input.staffId, today) };
}

/** Versi aman untuk halaman staff: bila gagal, SOP tetap bisa diisi tanpa panel koordinasi. */
export async function loadSopContextForStaff(staffId: string): Promise<SopContext | null> {
  try {
    const row = await prisma.staff.findUnique({
      where: { staffId },
      select: { outletId: true, position: true },
    });
    if (!row) return null;
    return await getSopContext({ staffId, outletId: row.outletId, position: row.position ?? "" });
  } catch (error) {
    console.error("[sop-context]", staffId, error);
    return null;
  }
}

async function getTrackRecord(staffId: string, today: string, days = 7): Promise<SopTrackRecord> {
  const from = new Date(`${addDaysToDateKey(today, -(days - 1))}T00:00:00Z`);
  const rows = await prisma.dailyReportSubmission.findMany({
    where: { staffId, reportDate: { gte: from } },
    select: {
      reportDate: true,
      leaderValidation: true,
      leaderValidationNote: true,
      leaderValidatedByName: true,
      template: { select: { title: true } },
    },
    orderBy: { reportDate: "desc" },
  });
  const record: SopTrackRecord = {
    days,
    total: rows.length,
    valid: 0,
    revisi: 0,
    tidak_valid: 0,
    belum_dicek: 0,
    latest_findings: [],
  };
  for (const r of rows) {
    if (!r.leaderValidation) record.belum_dicek += 1;
    else if (r.leaderValidation === "valid") record.valid += 1;
    else if (r.leaderValidation === "revisi") record.revisi += 1;
    else record.tidak_valid += 1;
    if (r.leaderValidation && r.leaderValidation !== "valid" && record.latest_findings.length < 3) {
      record.latest_findings.push({
        date: r.reportDate.toISOString().slice(0, 10),
        title: r.template.title,
        validation: r.leaderValidation,
        note: r.leaderValidationNote,
        by: r.leaderValidatedByName,
      });
    }
  }
  return record;
}

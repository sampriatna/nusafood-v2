/**
 * Perhitungan kinerja murni (tanpa DB) — dipakai service & diuji terpisah.
 *
 * Aturan (dihitung dari tugas yang deadline-nya jatuh di periode):
 * - Tepat waktu : laporan masuk ≤ deadline (atau selesai tanpa tanda terlambat).
 * - Terlambat   : laporan masuk > deadline / ditandai terlambat.
 * - Belum lapor : belum ada laporan dan deadline sudah lewat (juga dihitung terlambat).
 * - Berjalan    : belum ada laporan, deadline belum lewat → tidak ikut skor.
 * Skor = tepat waktu ÷ (tugas yang deadline-nya sudah lewat atau sudah dilaporkan).
 */

export type PerfTaskInput = {
  task_id: string;
  task_title: string;
  status: string;
  deadline: string | Date;
  submitted_at?: string | Date | null;
  verified_at?: string | Date | null;
  is_late?: boolean;
  staff_id?: string | null;
  pic_name: string;
  outlet: string;
  position_group?: string | null;
};

export type PerfBucket = {
  key: string;
  label: string;
  sublabel?: string;
  total: number;
  on_time: number;
  late_done: number;
  overdue: number;
  in_progress: number;
  revision: number;
  verified: number;
  /** 0–100, null jika belum ada tugas yang bisa dinilai. */
  score: number | null;
  late_tasks: { task_id: string; task_title: string; deadline: string; kind: "late" | "overdue" }[];
};

const REPORTED = new Set([
  "SUBMITTED",
  "RESUBMITTED",
  "WAITING_VERIFICATION",
  "DONE",
  "VERIFIED",
  "REVISI",
  "REVISION",
]);
const REVISION = new Set(["REVISI", "REVISION"]);
const VERIFIED = new Set(["DONE", "VERIFIED"]);
const CANCELLED = new Set(["CANCELLED", "CANCELED"]);

export type TaskOutcome = "on_time" | "late_done" | "overdue" | "in_progress";

function toMs(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function classifyTask(task: PerfTaskInput, now: Date): TaskOutcome {
  const deadline = toMs(task.deadline) ?? now.getTime();
  const submitted = toMs(task.submitted_at);
  const reported = REPORTED.has(task.status) || submitted !== null;
  if (reported) {
    if (task.is_late) return "late_done";
    if (submitted !== null) return submitted > deadline ? "late_done" : "on_time";
    return "on_time";
  }
  return now.getTime() > deadline ? "overdue" : "in_progress";
}

function emptyBucket(key: string, label: string, sublabel?: string): PerfBucket {
  return {
    key,
    label,
    sublabel,
    total: 0,
    on_time: 0,
    late_done: 0,
    overdue: 0,
    in_progress: 0,
    revision: 0,
    verified: 0,
    score: null,
    late_tasks: [],
  };
}

export function scoreOf(b: Pick<PerfBucket, "on_time" | "late_done" | "overdue">): number | null {
  const graded = b.on_time + b.late_done + b.overdue;
  return graded ? Math.round((b.on_time / graded) * 100) : null;
}

export type GroupBy = "person" | "division" | "outlet";

export function aggregatePerformance(
  tasks: PerfTaskInput[],
  groupBy: GroupBy,
  opts: {
    now?: Date;
    divisionLabel?: (group: string) => string;
    outletLabel?: (outlet: string) => string;
  } = {},
): { buckets: PerfBucket[]; overall: PerfBucket } {
  const now = opts.now ?? new Date();
  const divisionLabel = opts.divisionLabel ?? ((g: string) => g);
  const outletLabel = opts.outletLabel ?? ((o: string) => o);
  const map = new Map<string, PerfBucket>();
  const overall = emptyBucket("all", "Semua");

  for (const task of tasks) {
    if (CANCELLED.has(task.status)) continue;
    let key: string;
    let label: string;
    let sublabel: string | undefined;
    if (groupBy === "person") {
      key = task.staff_id || `name:${task.pic_name.trim().toLowerCase()}`;
      label = task.pic_name.trim() || "Tanpa nama";
      sublabel = [task.position_group ? divisionLabel(task.position_group) : null, outletLabel(task.outlet)]
        .filter(Boolean)
        .join(" · ");
    } else if (groupBy === "division") {
      key = task.position_group || "lainnya";
      label = task.position_group ? divisionLabel(task.position_group) : "Tanpa divisi";
    } else {
      key = task.outlet || "lainnya";
      label = task.outlet ? outletLabel(task.outlet) : "Tanpa outlet";
    }

    const bucket = map.get(key) ?? emptyBucket(key, label, sublabel);
    map.set(key, bucket);

    const outcome = classifyTask(task, now);
    for (const b of [bucket, overall]) {
      b.total += 1;
      b[outcome] += 1;
      if (REVISION.has(task.status)) b.revision += 1;
      if (VERIFIED.has(task.status)) b.verified += 1;
    }
    if (outcome === "late_done" || outcome === "overdue") {
      bucket.late_tasks.push({
        task_id: task.task_id,
        task_title: task.task_title,
        deadline: new Date(task.deadline).toISOString(),
        kind: outcome === "overdue" ? "overdue" : "late",
      });
    }
  }

  const buckets = [...map.values()];
  for (const b of [...buckets, overall]) b.score = scoreOf(b);
  for (const b of buckets) {
    b.late_tasks.sort((a, c) => c.deadline.localeCompare(a.deadline));
    b.late_tasks = b.late_tasks.slice(0, 10);
  }
  // Nilai terendah dulu → yang perlu perhatian langsung terlihat; tanpa nilai di akhir.
  buckets.sort((a, c) => {
    if (a.score === null && c.score === null) return c.total - a.total;
    if (a.score === null) return 1;
    if (c.score === null) return -1;
    return a.score - c.score || c.total - a.total;
  });
  return { buckets, overall };
}

export type ScoreGrade = "good" | "warning" | "critical" | "none";

export function gradeOf(score: number | null): ScoreGrade {
  if (score === null) return "none";
  if (score >= 90) return "good";
  if (score >= 75) return "warning";
  return "critical";
}

// ── Kepatuhan SOP harian (laporan dari link personal staff) ────────────────

export type SopStaffInput = {
  staff_id: string;
  name: string;
  outlet: string;
  outlet_id: string;
  /** Posisi standar jabatan utama (mis. "kasir"). */
  primary: string;
  /** Posisi tambahan yang boleh dibantu. */
  secondary: string[];
};

export type SopTemplateInput = {
  id: string;
  outlet_id: string | null;
  position_group: string | null;
  /** Shift kosong = berlaku semua shift. */
  shift_codes?: string[];
  /** Hindari template baru menghukum tanggal sebelum template dibuat. */
  created_date?: string | null;
};

export type SopResult = { required: number; done: number; missed: { date: string; template_id: string }[] };

/**
 * Hitung wajib vs terisi per staff per hari (YYYY-MM-DD), mengikuti aturan Laporan Harian:
 * template wajib yang cocok outlet + posisi efektif + shift efektif hari itu.
 * Template shift-specific tanpa data shift tidak dihitung sebagai kewajiban (lebih aman daripada false penalty).
 * Laporan yang divalidasi leader "tidak valid"/"manipulasi" tidak dihitung terisi.
 */
export function computeSopCompliance(input: {
  staff: SopStaffInput[];
  templates: SopTemplateInput[];
  dates: string[];
  /** key `${staff_id}|${date}` → posisi aktif dari jadwal. */
  duties: Map<string, string[]>;
  /** key `${staff_id}|${date}` → 1K/2K/3K. */
  shifts?: Map<string, string>;
  /** key `${staff_id}|${template_id}|${date}` untuk laporan yang sah. */
  submissions: Set<string>;
  matchesPosition: (templateGroup: string | null, position: string) => boolean;
}): Map<string, SopResult> {
  const result = new Map<string, SopResult>();
  for (const s of input.staff) {
    const r: SopResult = { required: 0, done: 0, missed: [] };
    const allowed = new Set([s.primary, ...s.secondary]);
    for (const date of input.dates) {
      const scheduled = (input.duties.get(`${s.staff_id}|${date}`) ?? []).filter((p) => allowed.has(p));
      const positions = scheduled.length ? scheduled : [s.primary];
      const shift = input.shifts?.get(`${s.staff_id}|${date}`);
      for (const t of input.templates) {
        if (t.created_date && date < t.created_date) continue;
        if (t.outlet_id && t.outlet_id !== s.outlet_id) continue;
        if (!positions.some((p) => input.matchesPosition(t.position_group, p))) continue;
        if (t.shift_codes?.length) {
          if (!shift || !t.shift_codes.includes(shift)) continue;
        }
        r.required += 1;
        if (input.submissions.has(`${s.staff_id}|${t.id}|${date}`)) r.done += 1;
        else r.missed.push({ date, template_id: t.id });
      }
    }
    result.set(s.staff_id, r);
  }
  return result;
}

export function sopScore(required: number, done: number): number | null {
  return required ? Math.round((done / required) * 100) : null;
}

/** Skor penentu urutan & label: yang terendah dari skor yang tersedia. */
export function worstScore(...scores: (number | null | undefined)[]): number | null {
  const valid = scores.filter((s): s is number => typeof s === "number");
  return valid.length ? Math.min(...valid) : null;
}

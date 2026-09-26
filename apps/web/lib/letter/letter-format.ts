/**
 * Format data surat teguran/SP jadi teks dokumen yang rapi.
 * Pure & client-safe — dipakai di dokumen cetak dan preview generator.
 * Tidak mengubah fakta: hanya tanggal, kapitalisasi, tanda baca, dan
 * kalimat template bawaan sistem lama.
 */

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const TZ = "Asia/Jakarta";

/** Nama lengkap outlet untuk dokumen (kode di DB → nama resmi). */
export const OUTLET_DISPLAY_NAMES: Record<string, string> = {
  KBU: "Kopi Buri Umah",
  KISAMEN: "Kisamen",
  SAMTARO: "Samtaro",
  NUSAFISHING: "Nusa Fishing",
  GENERAL: "Kantor Pusat",
};

export function outletLabel(code: string | null | undefined, fullName?: string | null): string {
  const c = (code ?? "").trim();
  const given = (fullName ?? "").trim();
  const name =
    (given && given.toUpperCase() !== c.toUpperCase() ? given : "") ||
    OUTLET_DISPLAY_NAMES[c.toUpperCase()] ||
    "";
  if (!c || c === "ALL") return name || "—";
  if (!name || name.toUpperCase() === c.toUpperCase()) return c;
  return `${name} (${c.toUpperCase()})`;
}

export function romanLevel(level: number): string {
  return ["", "I", "II", "III"][level] ?? String(level);
}

function wibParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour") % 24, min: get("minute") };
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "2026-08-02" / ISO → "2 Agustus 2026" (tanggal-saja tidak digeser zona waktu). */
export function formatTanggal(value: string | Date | null | undefined): string {
  if (!value) return "—";
  if (typeof value === "string") {
    const m = value.trim().match(DATE_ONLY);
    if (m) return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const p = wibParts(date);
  return `${p.d} ${MONTHS[p.m - 1]} ${p.y}`;
}

/** ISO → "27 Agustus 2026, 21.05 WIB". */
export function formatTanggalJam(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const p = wibParts(date);
  const hh = String(p.h).padStart(2, "0");
  const mm = String(p.min).padStart(2, "0");
  return `${p.d} ${MONTHS[p.m - 1]} ${p.y}, ${hh}.${mm} WIB`;
}

/** Ganti tanggal mentah (ISO / YYYY-MM-DD) di dalam teks bebas. */
export function humanizeDatesInText(text: string): string {
  return text
    .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?/g, (iso) =>
      formatTanggalJam(iso),
    )
    .replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (d) => formatTanggal(d));
}

/** Rapikan kalimat: spasi, huruf besar di awal, titik di akhir. Tidak mengubah isi. */
export function tidySentence(text: string | null | undefined): string {
  const lines = String(text ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return lines
    .map((line) => {
      const first = line.charAt(0);
      let out = first.toLocaleUpperCase("id-ID") + line.slice(1);
      // Poin daftar ("1. …", "- …") dibiarkan; kalimat biasa diberi titik.
      if (!/[.!?:;)"”]$/.test(out) && !/^(\d+[.)]|[-•*])\s/.test(out)) out += ".";
      return out;
    })
    .join("\n");
}

const TASK_STATUS_TEXT: Record<string, string> = {
  CREATED: "belum dikirim ke karyawan",
  SENT: "sudah dikirim namun belum dibuka",
  OPEN: "belum dikerjakan",
  OPENED: "sudah dibuka namun belum dilaporkan",
  WA_FAILED: "belum diterima karyawan",
  LATE: "terlambat dan belum dilaporkan",
  SUBMITTED: "sudah dilaporkan namun belum diverifikasi",
  RESUBMITTED: "sudah dilaporkan ulang namun belum diverifikasi",
  WAITING_VERIFICATION: "menunggu verifikasi",
  REVISI: "memerlukan revisi",
  REVISION_REQUESTED: "memerlukan revisi",
  DONE: "selesai",
  VERIFIED: "selesai dan terverifikasi",
};

export function taskStatusText(status: string): string {
  return TASK_STATUS_TEXT[status.toUpperCase()] ?? status.toLowerCase().replace(/_/g, " ");
}

/** Kalimat kronologi profesional dari data task (dipakai prefill baru). */
export function buildTaskChronology(input: {
  taskId: string;
  taskTitle: string;
  taskCreatedAt?: string | Date | null;
  taskDeadline: string | Date;
  taskStatus: string;
  isLate?: boolean;
}): string {
  const received = input.taskCreatedAt
    ? `Pada tanggal ${formatTanggal(input.taskCreatedAt)}, karyawan menerima tugas`
    : "Karyawan menerima tugas";
  const statusText = taskStatusText(input.taskStatus);
  return (
    `${received} "${input.taskTitle.trim()}" (${input.taskId}) dengan batas penyelesaian ` +
    `${formatTanggalJam(input.taskDeadline)}. Berdasarkan hasil monitoring sistem, ` +
    `tugas tersebut ${input.isLate ? "melewati batas waktu dan " : ""}berstatus ${statusText}, ` +
    `sehingga belum diselesaikan sesuai standar yang ditentukan.`
  );
}

const LEGACY_CHRONOLOGY =
  /^Task (\S+) berjudul "([\s\S]*)" memiliki deadline (\S+)\. Status saat ini: ([A-Z_]+)( \(terlambat\))?\.?$/;
const LEGACY_VIOLATION_INCOMPLETE = /^Task "([\s\S]*)" belum selesai sesuai standar\.?$/;
const LEGACY_VIOLATION_LATE =
  /^Karyawan terlambat menyelesaikan \/ melaporkan task "([\s\S]*)"\.?$/;

/** Kronologi: ubah format template lama sistem jadi kalimat; teks manual cukup dirapikan. */
export function presentChronology(text: string): string {
  const m = text.trim().match(LEGACY_CHRONOLOGY);
  if (m) {
    return buildTaskChronology({
      taskId: m[1],
      taskTitle: m[2],
      taskDeadline: m[3],
      taskStatus: m[4],
      isLate: Boolean(m[5]),
    });
  }
  return tidySentence(humanizeDatesInText(text));
}

export function buildViolationText(taskTitle: string, isLate: boolean): string {
  return isLate
    ? `Karyawan tidak menyelesaikan dan melaporkan tugas "${taskTitle.trim()}" sesuai batas waktu yang ditetapkan.`
    : `Tugas "${taskTitle.trim()}" belum diselesaikan sesuai standar kerja yang ditetapkan.`;
}

export function presentViolation(text: string): string {
  const t = text.trim();
  const late = t.match(LEGACY_VIOLATION_LATE);
  if (late) return buildViolationText(late[1], true);
  const incomplete = t.match(LEGACY_VIOLATION_INCOMPLETE);
  if (incomplete) return buildViolationText(incomplete[1], false);
  return tidySentence(humanizeDatesInText(t));
}

export type TimelineIssue = { level: "error" | "warning"; message: string };

/**
 * Cek urutan tanggal surat. error = tidak boleh disimpan,
 * warning = ditampilkan ke pembuat surat, tetap boleh lanjut.
 */
export function checkLetterTimeline(input: {
  incident_date?: string | null;
  correction_deadline?: string | null;
  task_deadline?: string | null;
  today?: string;
}): TimelineIssue[] {
  const issues: TimelineIssue[] = [];
  const key = (v?: string | null) => {
    if (!v) return null;
    if (DATE_ONLY.test(v)) return v;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    const p = wibParts(d);
    return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
  };
  const incident = key(input.incident_date);
  const correction = key(input.correction_deadline);
  const task = key(input.task_deadline);
  const today = input.today ?? key(new Date().toISOString());

  if (incident && correction && correction < incident) {
    issues.push({
      level: "error",
      message: `Deadline perbaikan (${formatTanggal(correction)}) sebelum tanggal surat (${formatTanggal(incident)}).`,
    });
  }
  if (incident && task && incident < task) {
    issues.push({
      level: "warning",
      message: `Tanggal surat (${formatTanggal(incident)}) sebelum batas waktu tugas (${formatTanggal(task)}). Pastikan pelanggaran memang sudah terjadi.`,
    });
  }
  if (correction && task && correction < task) {
    issues.push({
      level: "warning",
      message: `Deadline perbaikan (${formatTanggal(correction)}) lebih awal dari batas waktu tugas (${formatTanggal(task)}).`,
    });
  }
  if (incident && today && incident > today) {
    issues.push({
      level: "warning",
      message: `Tanggal surat (${formatTanggal(incident)}) ada di masa depan.`,
    });
  }
  if (correction && incident) {
    const days =
      (Date.parse(`${correction}T00:00:00Z`) - Date.parse(`${incident}T00:00:00Z`)) / 86_400_000;
    if (days > 60) {
      issues.push({
        level: "warning",
        message: `Deadline perbaikan ${Math.round(days)} hari setelah tanggal surat — cukup lama, pastikan sudah benar.`,
      });
    }
  }
  return issues;
}

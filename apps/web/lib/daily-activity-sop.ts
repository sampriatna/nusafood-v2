export const WORK_SHIFT_CODES = ["1K", "2K", "3K", "1R", "2R", "1S"] as const;

export type WorkShiftCode = (typeof WORK_SHIFT_CODES)[number];

type ShiftDefinition = {
  label: string;
  outlet: "KBU" | "KISAMEN" | "SAMTARO";
  start: string;
  end: string;
  /** Jam khusus hari Minggu (mis. Samtaro buka lebih pagi). */
  sunday?: { start: string; end: string };
  description: string;
  /** SOP yang diikuti: tag shift KBU yang setara. */
  sop_as: "1K" | "2K" | "3K";
  /** Untuk kategori Closing pakai SOP shift ini (shift tunggal: opening s.d. final closing). */
  closing_as?: "1K" | "2K" | "3K";
};

export const WORK_SHIFT_DEFINITIONS: Record<WorkShiftCode, ShiftDefinition> = {
  "1K": {
    label: "Shift 1K",
    outlet: "KBU",
    start: "09:00",
    end: "19:00",
    description: "Opening + operasional + handover shift",
    sop_as: "1K",
  },
  "2K": {
    label: "Shift 2K",
    outlet: "KBU",
    start: "11:00",
    end: "21:00",
    description: "Operasional + kontrol rush + handover shift",
    sop_as: "2K",
  },
  "3K": {
    label: "Shift 3K",
    outlet: "KBU",
    start: "12:00",
    end: "22:00",
    description: "Operasional + final closing outlet",
    sop_as: "3K",
  },
  "1R": {
    label: "Shift 1R",
    outlet: "KISAMEN",
    start: "09:30",
    end: "19:30",
    description: "Opening + operasional + handover ke 2R",
    sop_as: "1K",
  },
  "2R": {
    label: "Shift 2R",
    outlet: "KISAMEN",
    start: "11:00",
    end: "21:00",
    description: "Terima handover + operasional + final closing outlet",
    sop_as: "3K",
  },
  "1S": {
    label: "Shift 1S",
    outlet: "SAMTARO",
    start: "10:45",
    end: "21:00",
    sunday: { start: "08:00", end: "18:00" },
    description: "Satu shift penuh: opening sampai final closing",
    sop_as: "1K",
    closing_as: "3K",
  },
};

/** Kode shift yang dipakai outlet. Outlet lain (tanpa aturan khusus) boleh semua. */
export function shiftCodesForOutlet(outletCode?: string | null): WorkShiftCode[] {
  const code = (outletCode ?? "").trim().toUpperCase();
  const own = WORK_SHIFT_CODES.filter((c) => WORK_SHIFT_DEFINITIONS[c].outlet === code);
  return own.length ? own : [...WORK_SHIFT_CODES];
}

function isSundayKey(dateKey?: string | null): boolean {
  if (!dateKey) return false;
  const d = new Date(`${dateKey}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.getUTCDay() === 0;
}

/** Jam shift pada tanggal tertentu (YYYY-MM-DD, WIB). */
export function shiftHours(code: WorkShiftCode, dateKey?: string | null): { start: string; end: string } {
  const def = WORK_SHIFT_DEFINITIONS[code];
  return isSundayKey(dateKey) && def.sunday ? def.sunday : { start: def.start, end: def.end };
}

export type SopInstructionMeta = {
  why_text?: string | null;
  operational_impact?: string | null;
  instruction_note?: string | null;
  shift_codes?: WorkShiftCode[];
};

const META_PREFIX = "NF3_SOP_V2:";

export function normalizeWorkShiftCode(value: unknown): WorkShiftCode | null {
  const normalized = String(value ?? "").trim().toUpperCase();
  return (WORK_SHIFT_CODES as readonly string[]).includes(normalized)
    ? (normalized as WorkShiftCode)
    : null;
}

export function encodeSopDescription(
  meta: SopInstructionMeta,
  fallback = "",
): string {
  const payload = {
    v: 2,
    why_text: meta.why_text?.trim() || undefined,
    operational_impact: meta.operational_impact?.trim() || undefined,
    instruction_note: meta.instruction_note?.trim() || undefined,
    shift_codes: (meta.shift_codes ?? []).filter(
      (shift, index, all) => all.indexOf(shift) === index,
    ),
    fallback: fallback.trim() || undefined,
  };
  return `${META_PREFIX}${JSON.stringify(payload)}`;
}

export function parseSopDescription(value?: string | null): SopInstructionMeta & {
  fallback?: string | null;
} {
  const raw = value?.trim() ?? "";
  if (!raw.startsWith(META_PREFIX)) {
    return { instruction_note: raw || null, fallback: raw || null };
  }

  try {
    const parsed = JSON.parse(raw.slice(META_PREFIX.length)) as Record<
      string,
      unknown
    >;
    const shifts = Array.isArray(parsed.shift_codes)
      ? parsed.shift_codes
          .map(normalizeWorkShiftCode)
          .filter((shift): shift is WorkShiftCode => Boolean(shift))
      : [];
    return {
      why_text:
        typeof parsed.why_text === "string" ? parsed.why_text.trim() || null : null,
      operational_impact:
        typeof parsed.operational_impact === "string"
          ? parsed.operational_impact.trim() || null
          : null,
      instruction_note:
        typeof parsed.instruction_note === "string"
          ? parsed.instruction_note.trim() || null
          : null,
      shift_codes: [...new Set(shifts)],
      fallback:
        typeof parsed.fallback === "string" ? parsed.fallback.trim() || null : null,
    };
  } catch {
    return { instruction_note: raw || null, fallback: raw || null };
  }
}

/**
 * Apakah SOP bertag shift berlaku untuk shift staff hari ini.
 * Shift outlet lain mengikuti SOP shift KBU yang setara (1R = 1K, 2R = 3K,
 * 1S = opening 1K + final closing 3K), kecuali template diberi tag kodenya sendiri.
 */
export function templateAppliesToShift(
  shiftCodes: readonly string[] | undefined,
  shiftCode: WorkShiftCode | null | undefined,
  category?: string | null,
): boolean {
  if (!shiftCodes?.length) return true;
  if (!shiftCode) return false;
  if (shiftCodes.includes(shiftCode)) return true;
  const def = WORK_SHIFT_DEFINITIONS[shiftCode];
  const base =
    def.closing_as && (category ?? "").trim().toLowerCase() === "closing"
      ? def.closing_as
      : def.sop_as;
  return base !== shiftCode && shiftCodes.includes(base);
}

/** Hilangkan label internal P0/P1/P2 dari copy yang dibaca staff. */
export function stripOperationalPrefix(value?: string | null): string {
  return (value ?? "")
    .replace(/^P[0-3]\s*·\s*[^—-]+\s*[—-]\s*/i, "")
    .trim();
}

export function shiftTimeLabel(shiftCode?: WorkShiftCode | null, dateKey?: string | null): string {
  if (!shiftCode) return "";
  const { start, end } = shiftHours(shiftCode, dateKey);
  return `${WORK_SHIFT_DEFINITIONS[shiftCode].label} · ${start}–${end}`;
}

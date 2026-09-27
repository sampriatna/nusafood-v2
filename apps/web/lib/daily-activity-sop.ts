export const WORK_SHIFT_CODES = ["1K", "2K", "3K"] as const;

export type WorkShiftCode = (typeof WORK_SHIFT_CODES)[number];

export const WORK_SHIFT_DEFINITIONS: Record<
  WorkShiftCode,
  { label: string; start: string; end: string; description: string }
> = {
  "1K": {
    label: "Shift 1K",
    start: "09:00",
    end: "19:00",
    description: "Opening + operasional + handover shift",
  },
  "2K": {
    label: "Shift 2K",
    start: "11:00",
    end: "21:00",
    description: "Operasional + kontrol rush + handover shift",
  },
  "3K": {
    label: "Shift 3K",
    start: "12:00",
    end: "22:00",
    description: "Operasional + final closing outlet",
  },
};

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

export function templateAppliesToShift(
  shiftCodes: readonly WorkShiftCode[] | undefined,
  shiftCode: WorkShiftCode | null | undefined,
): boolean {
  if (!shiftCodes?.length) return true;
  if (!shiftCode) return false;
  return shiftCodes.includes(shiftCode);
}

/** Hilangkan label internal P0/P1/P2 dari copy yang dibaca staff. */
export function stripOperationalPrefix(value?: string | null): string {
  return (value ?? "")
    .replace(/^P[0-3]\s*·\s*[^—-]+\s*[—-]\s*/i, "")
    .trim();
}

export function shiftTimeLabel(shiftCode?: WorkShiftCode | null): string {
  if (!shiftCode) return "";
  const shift = WORK_SHIFT_DEFINITIONS[shiftCode];
  return `${shift.label} · ${shift.start}–${shift.end}`;
}

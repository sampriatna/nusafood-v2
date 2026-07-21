import { REPORT_POSITION_GROUPS } from "@nusafood/types";

export { REPORT_POSITION_GROUPS };

export type PositionGroup = (typeof REPORT_POSITION_GROUPS)[number];

export const POSITION_GROUP_LABELS: Record<PositionGroup, string> = {
  Waiters: "Waiters / Pramusaji",
  Bar: "Bar / Barista",
  Dapur: "Dapur / Kitchen",
  PA: "PA / OB (Public Area)",
};

/** Map teks jabatan bebas ke grup posisi standar (sama dengan template kegiatan). */
export function normalizePositionGroup(position: string): string {
  const p = (position || "").trim().toLowerCase();
  if (!p) return "";
  if (
    [
      "pa",
      "ob",
      "public area",
      "publicarea",
      "office boy",
      "officeboy",
      "klindingan",
      "cleaning",
      "kebersihan",
    ].some((k) => p === k || p.includes(k))
  ) {
    return "PA";
  }
  if (
    ["waiter", "waiters", "server", "floor", "pramusaji", "kasir"].some((k) =>
      p.includes(k),
    )
  ) {
    return "Waiters";
  }
  if (["barista", "bar", "bartender"].some((k) => p.includes(k))) {
    return "Bar";
  }
  if (
    ["cook", "chef", "dapur", "kitchen", "produksi"].some((k) => p.includes(k))
  ) {
    return "Dapur";
  }
  return position.trim();
}

export function isPositionGroup(value: string): value is PositionGroup {
  return (REPORT_POSITION_GROUPS as readonly string[]).includes(value);
}

/** Resolve nilai jabatan staff (termasuk legacy) ke grup posisi standar. */
export function resolveStaffPositionGroup(position: string): PositionGroup | "" {
  const normalized = normalizePositionGroup(position);
  if (isPositionGroup(normalized)) return normalized;

  const exact = REPORT_POSITION_GROUPS.find(
    (group) => group.toLowerCase() === position.trim().toLowerCase(),
  );
  return exact ?? "";
}

export function getPositionGroupLabel(group: string): string {
  if (isPositionGroup(group)) return POSITION_GROUP_LABELS[group];
  return group;
}

/** Simpan jabatan staff dalam format grup standar agar cocok dengan template kegiatan. */
export function sanitizeStaffPosition(position?: string | null): string | null {
  if (!position?.trim()) return null;
  const resolved = resolveStaffPositionGroup(position);
  if (resolved) return resolved;
  return position.trim();
}

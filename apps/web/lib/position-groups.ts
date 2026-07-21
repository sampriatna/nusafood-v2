import { REPORT_POSITION_GROUPS } from "@nusafood/types";

export { REPORT_POSITION_GROUPS };

export type PositionGroup = (typeof REPORT_POSITION_GROUPS)[number];

export const POSITION_GROUP_LABELS: Record<PositionGroup, string> = {
  Waiters: "Waiters / Pramusaji",
  Bar: "Bar / Barista",
  Dapur: "Dapur / Kitchen",
  PA: "PA / OB (Public Area)",
  Kasir: "Kasir",
  Purchasing: "Purchasing / Pembelian",
  Gudang: "Warehouse / Gudang",
  ProduksiFnB: "Produksi FnB",
  ProduksiNF: "Produksi NF",
  Advertising: "Advertising / Marketing",
  AdminMP: "Admin MP",
  CSNF: "CS NF / Customer Service",
  Finance: "Finance / Keuangan",
  Design: "Design / Editor",
};

function matchesAny(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text === k || text.includes(k));
}

/** Map teks jabatan bebas ke grup posisi standar (sama dengan template kegiatan). */
export function normalizePositionGroup(position: string): string {
  const p = (position || "").trim().toLowerCase();
  if (!p) return "";

  const exact = REPORT_POSITION_GROUPS.find(
    (group) => group.toLowerCase() === p,
  );
  if (exact) return exact;

  if (
    matchesAny(p, [
      "pa",
      "ob",
      "public area",
      "publicarea",
      "office boy",
      "officeboy",
      "klindingan",
      "cleaning",
      "kebersihan",
    ])
  ) {
    return "PA";
  }
  if (matchesAny(p, ["kasir", "cashier"])) return "Kasir";
  if (matchesAny(p, ["waiter", "waiters", "server", "floor", "pramusaji"])) {
    return "Waiters";
  }
  if (matchesAny(p, ["barista", "bar", "bartender"])) return "Bar";
  if (matchesAny(p, ["produksi nf", "produksinf"])) return "ProduksiNF";
  if (matchesAny(p, ["produksi fnb", "produksifnb", "produksi f&b"])) {
    return "ProduksiFnB";
  }
  if (matchesAny(p, ["purchasing", "pembelian", "procurement"])) {
    return "Purchasing";
  }
  if (matchesAny(p, ["gudang", "warehouse", "logistik"])) return "Gudang";
  if (matchesAny(p, ["advertising", "marketing", "iklan"])) return "Advertising";
  if (matchesAny(p, ["admin mp", "adminmp"])) return "AdminMP";
  if (matchesAny(p, ["cs nf", "csnf", "customer service"])) return "CSNF";
  if (matchesAny(p, ["finance", "keuangan", "akuntansi", "accounting"])) {
    return "Finance";
  }
  if (matchesAny(p, ["design", "editor", "desain", "creative"])) {
    return "Design";
  }
  if (matchesAny(p, ["cook", "chef", "dapur", "kitchen"])) return "Dapur";
  if (matchesAny(p, ["produksi", "production"])) return "ProduksiFnB";

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

/** Normalisasi label/kode outlet ke kode canonical di DB (KBU, KISAMEN, SAMTARO). */
const OUTLET_CODE_ALIASES: Record<string, string> = {
  KBU: "KBU",
  KISAMEN: "KISAMEN",
  Kisamen: "KISAMEN",
  kisamen: "KISAMEN",
  SAMTARO: "SAMTARO",
  "Samtaro Express": "SAMTARO",
  "samtaro express": "SAMTARO",
};

export function normalizeOutletCode(outlet: string | null | undefined): string {
  const raw = (outlet ?? "").trim();
  if (!raw || raw === "ALL") return raw;
  return OUTLET_CODE_ALIASES[raw] ?? raw;
}

export const OUTLET_FILTER_OPTIONS = [
  { value: "KBU", label: "KBU" },
  { value: "KISAMEN", label: "Kisamen" },
  { value: "SAMTARO", label: "Samtaro Express" },
  { value: "ALL", label: "Semua" },
] as const;

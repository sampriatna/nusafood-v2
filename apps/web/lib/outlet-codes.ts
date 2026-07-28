/** Normalisasi label/kode outlet ke kode canonical di DB. */
const OUTLET_CODE_ALIASES: Record<string, string> = {
  GENERAL: "GENERAL",
  General: "GENERAL",
  "General (Pusat)": "GENERAL",
  KBU: "KBU",
  KISAMEN: "KISAMEN",
  Kisamen: "KISAMEN",
  kisamen: "KISAMEN",
  SAMTARO: "SAMTARO",
  "Samtaro Express": "SAMTARO",
  "samtaro express": "SAMTARO",
  NUSAFISHING: "NUSAFISHING",
  "Nusa Fishing": "NUSAFISHING",
  "nusa fishing": "NUSAFISHING",
};

export function normalizeOutletCode(outlet: string | null | undefined): string {
  const raw = (outlet ?? "").trim();
  if (!raw || raw === "ALL") return raw;
  return OUTLET_CODE_ALIASES[raw] ?? raw;
}

export const OUTLET_FILTER_OPTIONS = [
  { value: "GENERAL", label: "General (Pusat)" },
  { value: "KBU", label: "KBU" },
  { value: "KISAMEN", label: "Kisamen" },
  { value: "SAMTARO", label: "Samtaro Express" },
  { value: "NUSAFISHING", label: "Nusa Fishing" },
  { value: "ALL", label: "Semua" },
] as const;

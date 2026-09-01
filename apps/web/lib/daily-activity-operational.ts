export type OperationalPriority = "P0" | "P1" | "P2" | "P3";
export type OperationalWorkType =
  | "TUGAS INTI"
  | "KONTROL"
  | "TINDAK LANJUT"
  | "LAPORAN"
  | "PROYEK/KHUSUS";

export type OperationalTemplateLike = {
  title: string;
  category: string;
  kind?: string | null;
  position_group?: string | null;
  standard_result?: string | null;
};

export type OperationalMeta = {
  priority: OperationalPriority;
  workType: OperationalWorkType;
  label: string;
};

function includesAny(text: string, values: string[]): boolean {
  return values.some((value) => text.includes(value));
}

export function classifyOperationalTemplate(
  template: OperationalTemplateLike,
): OperationalMeta {
  const title = (template.title || "").toLowerCase();
  const category = (template.category || "").toLowerCase();
  const position = (template.position_group || "").toLowerCase();
  const standard = (template.standard_result || "").toLowerCase();
  const text = `${title} ${category} ${position} ${standard}`;

  let workType: OperationalWorkType = "TUGAS INTI";

  if (template.kind === "issue_quick" || category === "kendala") {
    workType = "TINDAK LANJUT";
  } else if (template.kind === "special_task") {
    workType = "PROYEK/KHUSUS";
  } else if (
    includesAny(title, ["laporan", "rekap", "rekonsiliasi", "closing & eskalasi"])
  ) {
    workType = "LAPORAN";
  } else if (
    category === "monitoring" ||
    category === "stock" ||
    category === "finance" ||
    (category === "maintenance" && includesAny(title, ["cek", "inspeksi", "validasi"]))
  ) {
    workType = "KONTROL";
  }

  let priority: OperationalPriority = "P2";

  if (
    includesAny(text, [
      "keamanan",
      "food safety",
      "suhu chiller",
      "suhu freezer",
      "chiller / freezer",
      "gas",
      "api",
      "listrik",
      "kebocoran",
      "pompa",
      "rem",
      "ban",
      "rekonsiliasi kas",
      "selisih transaksi",
      "void",
      "refund",
    ])
  ) {
    priority = "P0";
  } else if (
    workType === "TINDAK LANJUT" ||
    [
      "opening",
      "closing",
      "production",
      "delivery",
      "purchasing",
      "monitoring",
      "stock",
      "finance",
      "marketing",
    ].includes(category) ||
    includesAny(text, [
      "customer",
      "toilet",
      "stok kritis",
      "menu kosong",
      "komplain",
      "campaign",
      "order",
      "produksi",
    ])
  ) {
    priority = "P1";
  } else if (
    category === "administration" ||
    workType === "LAPORAN" ||
    includesAny(text, ["arsip", "dokumen", "catat pengeluaran"])
  ) {
    priority = "P3";
  }

  if (workType === "PROYEK/KHUSUS" && priority === "P2") {
    priority = "P3";
  }

  return {
    priority,
    workType,
    label: `${priority} · ${workType}`,
  };
}

export function operationalStandardResult(
  template: OperationalTemplateLike,
  standardResult: string,
): string {
  const { label } = classifyOperationalTemplate(template);
  const clean = standardResult.trim();
  if (!clean) return label;
  if (/^P[0-3]\s*·/i.test(clean)) return clean;
  return `${label} — ${clean}`;
}

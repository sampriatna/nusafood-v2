import type { DailyActivitySeedDef } from "./daily-activity-seed-types";

export type StaffIssueRouteType =
  | "maintenance"
  | "cleaning"
  | "purchasing"
  | "service"
  | "other";

export type StaffIssueCategoryDefinition = {
  key:
    | "equipment"
    | "purchase_tools"
    | "utilities"
    | "cleaning"
    | "people_hr"
    | "system"
    | "other";
  code: string;
  title: string;
  label: string;
  pic_label: string;
  preferred_staff_names: string[];
  route_type: StaffIssueRouteType;
  standard_result: string;
  sort_order: number;
};

/**
 * Bahasa sengaja dibuat bahasa lapangan, bukan istilah database/department.
 * Title template menjadi kategori yang dipilih staff sekaligus sumber routing.
 */
export const STAFF_ISSUE_CATEGORIES: StaffIssueCategoryDefinition[] = [
  {
    key: "equipment",
    code: "RTPL-K11",
    title: "🔧 Alat / Mesin Rusak",
    label: "Alat / Mesin Rusak",
    pic_label: "Rudi",
    preferred_staff_names: ["Rudi"],
    route_type: "maintenance",
    standard_result:
      "Laporkan alat atau mesin yang rusak / tidak normal. Otomatis diteruskan ke Rudi.",
    sort_order: 91,
  },
  {
    key: "purchase_tools",
    code: "RTPL-K12",
    title: "🛒 Beli Alat / Tools / Perlengkapan",
    label: "Beli Alat / Tools / Perlengkapan",
    pic_label: "Mahmud / Dodi",
    preferred_staff_names: ["Mahmud", "Dodi"],
    route_type: "purchasing",
    standard_result:
      "Laporkan kebutuhan pembelian alat, tools, sparepart, atau perlengkapan operasional. Otomatis diteruskan ke Mahmud / Dodi.",
    sort_order: 92,
  },
  {
    key: "utilities",
    code: "RTPL-K13",
    title: "⚡ Listrik / Air / Fasilitas",
    label: "Listrik / Air / Fasilitas",
    pic_label: "Rudi",
    preferred_staff_names: ["Rudi"],
    route_type: "maintenance",
    standard_result:
      "Laporkan masalah listrik, air, saluran, lampu, AC, keran, atau fasilitas bangunan. Otomatis diteruskan ke Rudi.",
    sort_order: 93,
  },
  {
    key: "cleaning",
    code: "RTPL-K14",
    title: "🧹 Kebersihan",
    label: "Kebersihan",
    pic_label: "Gigin",
    preferred_staff_names: ["Gigin"],
    route_type: "cleaning",
    standard_result:
      "Laporkan masalah kebersihan area, toilet, sampah, atau standar kebersihan yang tidak terpenuhi. Otomatis diteruskan ke Gigin.",
    sort_order: 94,
  },
  {
    key: "people_hr",
    code: "RTPL-K15",
    title: "👥 Orang / SDM",
    label: "Orang / SDM",
    pic_label: "Gigin",
    preferred_staff_names: ["Gigin"],
    route_type: "other",
    standard_result:
      "Laporkan kendala orang / SDM seperti absensi orang, konflik kerja, kekurangan personel, atau pelanggaran kerja. Otomatis diteruskan ke Gigin.",
    sort_order: 95,
  },
  {
    key: "system",
    code: "RTPL-K16",
    title: "🖥️ Mesin Absen / Kasir / Aplikasi / Sistem NF",
    label: "Mesin Absen / Kasir / Aplikasi / Sistem NF",
    pic_label: "Alam NF",
    preferred_staff_names: ["Alam NF", "Alam"],
    route_type: "service",
    standard_result:
      "Laporkan error mesin absen, kasir/POS, printer kasir, login, aplikasi, atau sistem NF. Otomatis diteruskan ke Alam NF.",
    sort_order: 96,
  },
  {
    key: "other",
    code: "RTPL-K17",
    title: "❓ Lainnya / Tidak Tahu Kategori",
    label: "Lainnya / Tidak Tahu Kategori",
    pic_label: "Dodi",
    preferred_staff_names: ["Dodi"],
    route_type: "other",
    standard_result:
      "Pilih ini jika kendalanya tidak cocok dengan kategori lain. Otomatis diteruskan ke Dodi untuk dipilah.",
    sort_order: 97,
  },
];

export const ISSUE_CATEGORY_TEMPLATES: DailyActivitySeedDef[] =
  STAFF_ISSUE_CATEGORIES.map((category) => ({
    code: category.code,
    title: category.title,
    category: "Kendala",
    position_group: null,
    outlet_code: null,
    standard_result: category.standard_result,
    requires_photo: false,
    is_required_daily: false,
    kind: "issue_quick",
    sort_order: category.sort_order,
    checklist: [
      "Jelaskan apa yang terjadi, lokasi / alat / orang yang terkait, dan kondisi terbarunya.",
    ],
  }));

export const DEPRECATED_ISSUE_TEMPLATE_CODES = ["RTPL-K01"] as const;

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[🔧🛒⚡🧹👥🖥️❓]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Resolve kategori eksplisit yang dipilih staff dari title template issue_quick. */
export function resolveStaffIssueCategory(
  activityTitle: string,
): StaffIssueCategoryDefinition | null {
  const title = normalizeTitle(activityTitle);
  return (
    STAFF_ISSUE_CATEGORIES.find((category) => {
      const candidate = normalizeTitle(category.title);
      return title === candidate || title.includes(candidate);
    }) ?? null
  );
}

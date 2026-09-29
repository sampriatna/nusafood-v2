import type { ReportConditionStatus, Staff, TaskPriority } from "@nusafood/types";
import { prisma } from "@/lib/db";
import { resolveStaffPositionGroup } from "@/lib/position-groups";
import { listStaff } from "@/lib/services/staff.service";
import { createTask } from "@/lib/services/task-write.service";

export type DailyReportRouteType =
  | "safety"
  | "maintenance"
  | "cleaning"
  | "finance"
  | "purchasing"
  | "stock"
  | "service"
  | "other";

type RoutedTarget = {
  staff_id: string;
  name: string;
  position: string;
  outlet: string;
};

export type DailyReportRoutingResult = {
  routed: boolean;
  already_routed: boolean;
  route_type: DailyReportRouteType;
  route_label: string;
  target: RoutedTarget | null;
  task_id?: string;
  report_link?: string;
  needs_leader: boolean;
  reason?: string;
};

const CENTRAL_GROUPS = new Set([
  "Maintenance",
  "MaintenanceKebon",
  "Purchasing",
  "Finance",
  "Gudang",
  "SupirPA",
]);

const ROUTE_LABEL: Record<DailyReportRouteType, string> = {
  safety: "Keselamatan / kondisi berbahaya",
  maintenance: "Perbaikan & alat",
  cleaning: "Kebersihan & area",
  finance: "Kas & pembayaran",
  purchasing: "Belanja & pengadaan",
  stock: "Stok & bahan",
  service: "Pelayanan & operasional",
  other: "Butuh tindak lanjut",
};

const TASK_PREFIX: Record<DailyReportRouteType, string> = {
  safety: "Keselamatan",
  maintenance: "Perbaikan & Alat",
  cleaning: "Kebersihan & Area",
  finance: "Kas & Pembayaran",
  purchasing: "Belanja & Pengadaan",
  stock: "Stok & Bahan",
  service: "Pelayanan & Operasional",
  other: "Tindak Lanjut",
};

function hasAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

export function classifyDailyReportIssue(input: {
  note: string;
  activityTitle: string;
  position: string;
  statusCondition: ReportConditionStatus;
}): DailyReportRouteType {
  const text = `${input.activityTitle} ${input.note} ${input.position}`.toLowerCase();

  if (
    hasAny(text, [
      "korslet",
      "korsleting",
      "bau gas",
      "gas bocor",
      "kebakaran",
      "terbakar",
      "kesetrum",
      "bahaya",
      "percikan api",
      "kabel terbuka",
    ])
  ) {
    return "safety";
  }

  if (
    hasAny(text, [
      "maintenance",
      "maintance",
      "rusak",
      "mesin",
      "grinder",
      "blender",
      "freezer",
      "chiller",
      "ac ",
      "air conditioner",
      "lampu",
      "listrik",
      "pompa",
      "keran",
      "bocor",
      "mampet",
      "stop kontak",
      "saklar",
      "kabel",
      "engsel",
      "kompor",
      "oven",
      "printer",
      "kalibrasi",
    ])
  ) {
    return "maintenance";
  }

  if (
    hasAny(text, [
      "selisih uang",
      "selisih kas",
      "qris",
      "edc",
      "transfer",
      "refund",
      "void",
      "pembayaran",
      "uang kurang",
      "cash",
    ])
  ) {
    return "finance";
  }

  if (
    hasAny(text, [
      "kotor",
      "sampah",
      "toilet",
      " wc ",
      "bau pesing",
      "lantai kotor",
      "meja kotor",
      "becek",
      "bersihkan",
      "kebersihan",
      "berantakan",
    ])
  ) {
    return "cleaning";
  }

  if (
    input.statusCondition === "perlu_belanja" ||
    hasAny(text, [
      "perlu beli",
      "harus beli",
      "minta beli",
      "belanja",
      "pengadaan",
      "sparepart",
      "spare part",
      "material habis",
    ])
  ) {
    return "purchasing";
  }

  if (
    hasAny(text, [
      "stok",
      "stock",
      "bahan habis",
      "bahan menipis",
      "hampir habis",
      "sold out",
      "sold-out",
      "cup habis",
      "susu habis",
      "sirup habis",
      "es habis",
    ])
  ) {
    return "stock";
  }

  if (
    hasAny(text, [
      "pesanan",
      "order",
      "komplain",
      "complaint",
      "customer",
      "menu",
      "terlambat",
      "terlalu lama",
      "salah pesanan",
      "pesanan salah",
      "pesanan kurang",
    ])
  ) {
    return "service";
  }

  return "other";
}

function maintenanceSubject(text: string): string {
  const parts: string[] = [];
  if (hasAny(text, ["mesin kopi", "espresso", "coffee machine"])) {
    parts.push("Mesin Kopi");
  }
  if (text.includes("grinder")) parts.push("Grinder");
  if (hasAny(text, ["freezer", "chiller"])) parts.push("Freezer / Chiller");
  if (hasAny(text, [" ac ", "air conditioner"])) parts.push("AC");
  if (hasAny(text, ["pompa", "keran", "mampet", "bocor"])) {
    parts.push("Air / Plumbing");
  }
  if (hasAny(text, ["lampu", "listrik", "stop kontak", "saklar", "kabel"])) {
    parts.push("Kelistrikan");
  }
  if (hasAny(text, ["kompor", "oven"])) parts.push("Kompor / Oven");
  if (text.includes("printer")) parts.push("Printer");
  if (text.includes("blender")) parts.push("Blender");
  return [...new Set(parts)].slice(0, 2).join(" & ") || "Peralatan / Fasilitas";
}

function routeSubject(
  routeType: DailyReportRouteType,
  note: string,
  activityTitle: string,
): string {
  const text = `${activityTitle} ${note}`.toLowerCase();

  switch (routeType) {
    case "maintenance":
      return maintenanceSubject(` ${text} `);
    case "cleaning":
      if (text.includes("toilet") || text.includes(" wc ")) return "Toilet";
      if (text.includes("sampah")) return "Sampah / Area";
      if (text.includes("lantai")) return "Lantai / Area";
      if (text.includes("meja")) return "Meja / Area";
      return "Kebersihan Area";
    case "finance":
      if (text.includes("qris")) return "QRIS";
      if (text.includes("edc")) return "EDC";
      if (hasAny(text, ["selisih kas", "selisih uang", "uang kurang"])) {
        return "Selisih Kas";
      }
      if (text.includes("refund")) return "Refund";
      return "Transaksi / Kas";
    case "purchasing":
      if (hasAny(text, ["sparepart", "spare part"])) return "Sparepart";
      return "Pengadaan Barang";
    case "stock":
      return "Stok Bahan";
    case "service":
      if (hasAny(text, ["pesanan", "order", "salah pesanan", "pesanan salah"])) {
        return "Pesanan Customer";
      }
      if (hasAny(text, ["komplain", "complaint", "customer"])) {
        return "Keluhan Customer";
      }
      return "Operasional Outlet";
    case "safety":
      return "Kondisi Berbahaya";
    default:
      return activityTitle || "Kendala Operasional";
  }
}

export function buildDailyReportIssueTaskTitle(input: {
  routeType: DailyReportRouteType;
  note: string;
  activityTitle: string;
}): string {
  return `${TASK_PREFIX[input.routeType]} — ${routeSubject(
    input.routeType,
    input.note,
    input.activityTitle,
  )}`;
}

function routeInstruction(routeType: DailyReportRouteType): string {
  switch (routeType) {
    case "maintenance":
      return "Cek kondisi, lakukan perbaikan/kalibrasi yang diperlukan, uji fungsi, lalu laporkan hasil dan kebutuhan sparepart bila ada.";
    case "cleaning":
      return "Tindak lanjuti kebersihan area sampai standar outlet terpenuhi, lalu laporkan kondisi akhir.";
    case "finance":
      return "Cek transaksi atau kas terkait, cocokkan bukti, lalu laporkan hasil pengecekan dan selisih bila masih ada.";
    case "purchasing":
      return "Cek kebutuhan barang, pastikan spesifikasi/jumlahnya, lalu lanjutkan pengadaan sesuai prosedur.";
    case "stock":
      return "Cek stok fisik dan kebutuhan outlet, lalu koordinasikan pemenuhan atau pengadaan bila diperlukan.";
    case "service":
      return "Koordinasikan langsung dengan bagian terkait sampai kendala pelayanan/operasional selesai, lalu catat hasilnya.";
    case "safety":
      return "Amankan kondisi terlebih dahulu. Jangan operasikan alat/area yang berbahaya sebelum dinyatakan aman, lalu eskalasi ke leader.";
    default:
      return "Tindak lanjuti kendala, koordinasikan dengan pelapor bila perlu klarifikasi, lalu catat hasilnya.";
  }
}

function targetGroups(
  routeType: DailyReportRouteType,
  reporterPosition: string,
): string[] {
  const reporter = resolveStaffPositionGroup(reporterPosition) || reporterPosition;
  switch (routeType) {
    case "safety":
      return ["Maintenance", "MaintenanceKebon", "LeaderOutlet"];
    case "maintenance":
      return ["Maintenance", "MaintenanceKebon"];
    case "cleaning":
      return ["Waiters"];
    case "finance":
      return ["Finance", "Kasir", "LeaderOutlet"];
    case "purchasing":
      return ["Purchasing", "SupirPA", "LeaderOutlet"];
    case "stock":
      return ["Gudang", "Purchasing", "SupirPA", "LeaderOutlet"];
    case "service":
      if (reporter === "Waiters") return ["Dapur", "Bar", "Kasir", "LeaderOutlet"];
      if (reporter === "Dapur") return ["Kasir", "Waiters", "Bar", "LeaderOutlet"];
      if (reporter === "Bar") return ["Kasir", "Waiters", "Dapur", "LeaderOutlet"];
      if (reporter === "Kasir") return ["Dapur", "Bar", "Waiters", "LeaderOutlet"];
      return ["LeaderOutlet"];
    default:
      return ["LeaderOutlet"];
  }
}

function categoryFor(routeType: DailyReportRouteType): string {
  switch (routeType) {
    case "maintenance":
    case "safety":
      return "Maintenance";
    case "cleaning":
      return "Cleaning";
    case "stock":
      return "Stock";
    case "purchasing":
      return "Purchasing";
    case "finance":
      return "Finance";
    default:
      return "General";
  }
}

function priorityFor(routeType: DailyReportRouteType): TaskPriority {
  if (routeType === "safety") return "Urgent";
  if (["maintenance", "finance", "purchasing", "stock", "service"].includes(routeType)) {
    return "High";
  }
  return "Medium";
}

function deadlineFor(routeType: DailyReportRouteType): string {
  const now = new Date();
  const hours =
    routeType === "safety"
      ? 2
      : routeType === "service"
        ? 4
        : routeType === "cleaning"
          ? 4
          : routeType === "finance"
            ? 6
            : routeType === "stock" || routeType === "purchasing"
              ? 8
              : 24;
  now.setHours(now.getHours() + hours);
  return now.toISOString();
}

function normalizeGroup(staff: Staff): string {
  const group = resolveStaffPositionGroup(staff.position || "");
  if (group) return group;
  if (staff.role === "LEADER") return "LeaderOutlet";
  return staff.position || "";
}

async function chooseTarget(input: {
  reporterStaffId: string;
  outlet: string;
  groups: string[];
}): Promise<Staff | null> {
  const active = await listStaff({ status: "ACTIVE" });

  for (const group of input.groups) {
    const candidates = active.filter((staff) => {
      if (staff.staff_id === input.reporterStaffId || !staff.wa_number) return false;
      if (normalizeGroup(staff) !== group) return false;

      if (CENTRAL_GROUPS.has(group)) {
        return staff.outlet === input.outlet || staff.outlet === "GENERAL";
      }
      return staff.outlet === input.outlet;
    });

    if (!candidates.length) continue;
    if (candidates.length === 1) return candidates[0];

    const weighted = await Promise.all(
      candidates.map(async (staff) => ({
        staff,
        open: await prisma.task.count({
          where: {
            staffId: staff.staff_id,
            status: { notIn: ["DONE", "VERIFIED"] },
          },
        }),
      })),
    );
    weighted.sort(
      (a, b) => a.open - b.open || a.staff.name.localeCompare(b.staff.name, "id"),
    );
    return weighted[0]?.staff ?? null;
  }

  return null;
}

export async function routeDailyReportIssue(input: {
  submission_id: string;
  staff_id: string;
  staff_name: string;
  outlet: string;
  position: string;
  activity_title: string;
  status_condition: ReportConditionStatus;
  note: string;
  photo_url?: string | null;
  checklist_summary?: string;
}): Promise<DailyReportRoutingResult> {
  const routeType = classifyDailyReportIssue({
    note: input.note,
    activityTitle: input.activity_title,
    position: input.position,
    statusCondition: input.status_condition,
  });
  const routeLabel = ROUTE_LABEL[routeType];
  const needsLeader =
    input.status_condition === "follow_up_leader" ||
    routeType === "safety" ||
    routeType === "other";
  const sourceKey = `daily-report:${input.submission_id}`;

  const existing = await prisma.task.findFirst({
    where: { createdBy: sourceKey },
    select: {
      taskId: true,
      reportLink: true,
      staff: {
        select: {
          staffId: true,
          name: true,
          position: true,
          outlet: { select: { code: true } },
        },
      },
    },
  });
  if (existing) {
    return {
      routed: true,
      already_routed: true,
      route_type: routeType,
      route_label: routeLabel,
      target: existing.staff
        ? {
            staff_id: existing.staff.staffId,
            name: existing.staff.name,
            position: existing.staff.position || "",
            outlet: existing.staff.outlet.code,
          }
        : null,
      task_id: existing.taskId,
      report_link: existing.reportLink || undefined,
      needs_leader: needsLeader,
    };
  }

  const target = await chooseTarget({
    reporterStaffId: input.staff_id,
    outlet: input.outlet,
    groups: targetGroups(routeType, input.position),
  });

  if (!target) {
    return {
      routed: false,
      already_routed: false,
      route_type: routeType,
      route_label: routeLabel,
      target: null,
      needs_leader: true,
      reason: "Tidak ada PIC aktif yang cocok untuk routing otomatis",
    };
  }

  const note = input.note.trim() || "Tidak ada catatan tambahan.";
  const taskTitle = buildDailyReportIssueTaskTitle({
    routeType,
    note,
    activityTitle: input.activity_title,
  });
  const description = [
    `Temuan dari ${input.staff_name} (${input.position} · ${input.outlet}).`,
    `Kategori: ${routeLabel}`,
    `Kegiatan asal: ${input.activity_title}`,
    input.checklist_summary ? `Checklist: ${input.checklist_summary}` : null,
    "",
    "Masalah:",
    note,
    "",
    "Tindak lanjut:",
    routeInstruction(routeType),
  ]
    .filter(Boolean)
    .join("\n");

  const created = await createTask(
    {
      outlet: input.outlet,
      area: input.position || "Operasional",
      category: categoryFor(routeType),
      task_title: taskTitle,
      task_description: description,
      priority: priorityFor(routeType),
      pic_name: target.name,
      pic_wa: target.wa_number,
      staff_id: target.staff_id,
      deadline: deadlineFor(routeType),
      before_photo_url: input.photo_url || undefined,
    },
    { createdBy: sourceKey },
  );

  return {
    routed: true,
    already_routed: false,
    route_type: routeType,
    route_label: routeLabel,
    target: {
      staff_id: target.staff_id,
      name: target.name,
      position: target.position,
      outlet: target.outlet,
    },
    task_id: created.task.task_id,
    report_link: created.task.report_link,
    needs_leader: needsLeader,
  };
}

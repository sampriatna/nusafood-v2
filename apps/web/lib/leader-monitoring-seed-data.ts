import type {
  LeaderMonitorKind,
  LeaderMonitorTemplate,
  LeaderPhotoMode,
} from "@nusafood/types";

export type LeaderMonitorSeedDef = Omit<
  LeaderMonitorTemplate,
  "checklist"
> & {
  checklist: LeaderMonitorTemplate["checklist"];
};

function ci(
  templateId: string,
  texts: string[],
): LeaderMonitorTemplate["checklist"] {
  return texts.map((item_text, i) => ({
    id: `${templateId}-CI-${String(i + 1).padStart(2, "0")}`,
    item_text,
    sort_order: i + 1,
  }));
}

/** Stable legacy IDs used by UI/API (template_id on submit). */
export const LEADER_MONITOR_SEED_TEMPLATES: LeaderMonitorSeedDef[] = [
  {
    id: "LMT-OPEN",
    kind: "opening_control",
    title: "Opening Control Leader",
    menu_label: "Opening Control",
    description:
      "Cek fisik opening sebelum/siap buka — bukan cuma lihat submit staff.",
    standard_result:
      "Outlet siap buka, area customer bersih, staff di posisi, toilet aman, area depan rapi.",
    outlet_id: "KBU",
    target_time_start: "09:30",
    target_time_end: "10:15",
    photo_mode: "required",
    active: true,
    sort_order: 1,
    checklist: ci("LMT-OPEN", [
      "Area depan outlet bersih dari sampah kecil, daun, puntung rokok, plastik, dan tisu",
      "Parkiran dan jalur masuk customer aman, tidak licin, tidak becek, tidak berantakan",
      "Area meja customer sudah rapi dan siap dipakai",
      "Meja tidak lengket, tidak ada noda makanan/minuman",
      "Kursi tersusun rapi sesuai layout",
      "Toilet customer bersih, tidak bau, lantai aman, wastafel bersih",
      "Tempat sampah customer dan toilet tidak penuh",
      "Area kasir/bar sudah rapi dan siap operasional",
      "Area dapur tidak berantakan sebelum jam buka",
      "Staff hadir, grooming layak, dan sudah tahu posisi kerja masing-masing",
      "Checklist PA/OB sudah dicek fisik minimal 3 titik",
      "Jika laporan staff tidak sesuai lapangan, pilih status Ada catatan / Tidak sesuai",
    ]),
  },
  {
    id: "LMT-RAMAI",
    kind: "jam_ramai_control",
    title: "Kontrol Operasional Jam Ramai",
    menu_label: "Jam Ramai Control",
    description: "Kontrol saat customer ramai — area, order, staff, toilet.",
    standard_result:
      "Area tetap bersih, meja cepat dibersihkan, order tidak numpuk parah, pelayanan tetap jalan.",
    outlet_id: "KBU",
    target_time_start: "12:00",
    target_time_end: "14:00",
    photo_mode: "required_if_issue",
    active: true,
    sort_order: 2,
    checklist: ci("LMT-RAMAI", [
      "Meja bekas customer dibersihkan maksimal 5 menit setelah customer pergi",
      "Tidak ada piring/gelas kotor menumpuk di area customer",
      "Lantai area makan tidak penuh remah, tisu, tulang, nasi, atau sampah kecil",
      "Toilet tetap dicek, tidak menunggu sampai closing",
      "Tempat sampah tidak penuh atau bau",
      "Staff floor/waiters aktif melihat meja kosong dan meja kotor",
      "Kasir tidak membiarkan antrean tanpa arahan",
      "Dapur/bar tidak menumpuk order tanpa komunikasi ke leader",
      "Jika ada menu kosong, leader tahu dan sudah update ke kasir/waiters",
      "Customer yang terlihat menunggu lama dicek penyebabnya",
      "Area depan tetap rapi meskipun ramai",
      "Kendala operasional ditulis, bukan hanya disimpan di kepala",
    ]),
  },
  {
    id: "LMT-SPOT",
    kind: "spot_check_area",
    title: "Spot Check PA / OB",
    menu_label: "Spot Check Area",
    description:
      "Validasi hasil kerja PA/OB di lapangan. Jangan validasi hanya karena sudah submit.",
    standard_result:
      "Minimal 5 titik dicek fisik; laporan staff sesuai kondisi nyata atau ditandai revisi/tidak valid.",
    outlet_id: "KBU",
    target_time_start: "11:00",
    target_time_end: "20:00",
    photo_mode: "required",
    active: true,
    sort_order: 3,
    checklist: ci("LMT-SPOT", [
      "Cek toilet customer secara fisik, bukan hanya dari foto",
      "Cek area bawah meja customer",
      "Cek tempat sampah customer",
      "Cek area depan outlet / parkiran",
      "Cek tanaman / pot / area rumput kecil",
      "Cek lantai area makan apakah masih lengket atau kotor",
      "Cek apakah ada bau tidak enak di toilet, sampah, atau area lembap",
      "Bandingkan foto laporan staff dengan kondisi lapangan",
      "Jika foto tidak sesuai, blur, terlalu dekat, atau foto lama → tandai tidak valid",
      "Jika pekerjaan belum sesuai standar, staff wajib ulang saat itu juga",
      "Catat nama staff yang harus perbaikan",
      "Foto ulang kondisi setelah diperbaiki (jika sudah)",
    ]),
  },
  {
    id: "LMT-CLOSE",
    kind: "closing_control",
    title: "Closing Control Leader",
    menu_label: "Closing Control",
    description:
      "Audit closing — outlet aman ditinggal, tidak wariskan kotoran ke besok.",
    standard_result:
      "Outlet ditutup bersih, aman, rapi; tidak meninggalkan kerjaan kotor untuk pagi.",
    outlet_id: "KBU",
    target_time_start: "21:30",
    target_time_end: "22:15",
    photo_mode: "required",
    active: true,
    sort_order: 4,
    checklist: ci("LMT-CLOSE", [
      "Semua meja customer sudah bersih dan tidak lengket",
      "Kursi sudah dirapikan",
      "Lantai area customer sudah disapu dan titik kotor sudah dipel",
      "Kolong meja dicek dari sampah tersembunyi",
      "Toilet closing dicek ulang: kloset, lantai, wastafel, tempat sampah, bau",
      "Tempat sampah penuh sudah dibuang",
      "Area depan outlet tidak menyisakan sampah malam",
      "Tanaman/area outdoor aman dan tidak berantakan",
      "Peralatan kebersihan dikembalikan ke tempatnya",
      "Area kasir/bar rapi sebelum ditinggal",
      "Area dapur tidak meninggalkan sisa bahan/bau/kotoran yang mengganggu besok",
      "Masalah closing dicatat dan ditag ke staff terkait",
    ]),
  },
  {
    id: "LMT-ISSUE",
    kind: "issue_log",
    title: "Log Masalah Operasional",
    menu_label: "Issue Log / Catatan Masalah",
    description:
      "Catat masalah operasional supaya tidak hilang — follow up sampai selesai.",
    standard_result:
      "Masalah tercatat jelas: area, staff, tindakan, status follow up.",
    outlet_id: null,
    photo_mode: "required_if_issue",
    active: true,
    sort_order: 5,
    checklist: ci("LMT-ISSUE", [
      "Area masalah sudah jelas",
      "Masalah digambarkan konkret (bukan hanya 'kotor')",
      "Staff terkait dicatat",
      "Dampak ke operasional disebutkan",
      "Tindakan sementara sudah dilakukan / diinstruksikan",
      "Butuh follow up owner/admin sudah diputuskan",
      "Deadline perbaikan diisi jika perlu",
      "Status follow up di-update (Open / On Progress / Selesai)",
    ]),
  },
];

const legacyIdByKind = new Map<LeaderMonitorKind, string>(
  LEADER_MONITOR_SEED_TEMPLATES.map((t) => [t.kind, t.id]),
);

export function legacyTemplateIdForKind(kind: LeaderMonitorKind): string {
  return legacyIdByKind.get(kind) ?? kind;
}

export function photoModeToDb(mode: LeaderPhotoMode) {
  return mode;
}

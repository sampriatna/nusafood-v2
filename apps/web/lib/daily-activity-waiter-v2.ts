import type { DailyActivitySeedDef } from "./daily-activity-seed-types";
import type { WorkShiftCode } from "./daily-activity-sop";

export const WAITER_V1_TEMPLATE_CODES = [
  "RTPL-W01",
  "RTPL-W02",
  "RTPL-W03",
  "RTPL-W04",
  "RTPL-W05",
] as const;

type WaiterSeed = DailyActivitySeedDef & {
  why_text: string;
  operational_impact: string;
  instruction_note: string;
  shift_codes: WorkShiftCode[];
};

export const WAITER_V2_TEMPLATES: WaiterSeed[] = [
  {
    code: "RTPL-W11",
    title: "Opening & Service Ready",
    category: "Opening",
    position_group: "Waiters",
    standard_result:
      "Saat customer pertama datang, area sudah siap menerima tamu dan waiter sudah memahami kondisi operasional hari ini.",
    why_text:
      "Menit pertama membentuk kesan customer. Opening bukan sekadar bersih-bersih: waiter harus siap melayani tanpa masih mencari informasi menu, promo, area, atau perlengkapan.",
    operational_impact:
      "Jika opening belum siap, customer menunggu, meja belum layak dipakai, menu habis masih ditawarkan, dan pekerjaan tertunda akan menumpuk saat operasional mulai ramai.",
    instruction_note:
      "Lihat outlet dari sudut pandang customer. Selesaikan hal yang bisa langsung dibereskan; jika ada masalah di luar kewenangan waiter, laporkan ke PIC/leader sebelum customer terdampak.",
    shift_codes: ["1K"],
    requires_photo: true,
    is_required_daily: true,
    target_time_start: "09:00",
    target_time_end: "09:20",
    sort_order: 11,
    checklist: [
      "Area customer terlihat siap; tidak ada meja kosong yang kotor atau berantakan",
      "Meja dan kursi siap pakai; tissue, condiment, dan peralatan service tersedia",
      "Lampu, AC, musik/ambience, dan area masuk siap sesuai SOP outlet",
      "WC/customer area sudah layak; jika belum, laporkan ke PIC/leader untuk ditangani",
      "Sudah tahu menu sold-out atau stok kritis hari ini",
      "Sudah tahu promo dan menu yang sedang didorong",
      "Sudah tahu pembagian area/PIC dan reservasi atau kebutuhan khusus bila ada",
    ],
  },
  {
    code: "RTPL-W12",
    title: "Shift Takeover & Service Ready",
    category: "Opening",
    position_group: "Waiters",
    standard_result:
      "Masuk shift dengan memahami kondisi outlet, meja/order yang sedang berjalan, dan tanggung jawab area tanpa memulai kerja dalam keadaan buta.",
    why_text:
      "Pergantian shift adalah titik rawan informasi hilang. Waiter yang baru masuk harus tahu apa yang sedang terjadi sebelum mengambil alih pelayanan.",
    operational_impact:
      "Handover yang lemah dapat membuat order terlupa, customer harus mengulang permintaan, komplain terputus, atau dua waiter mengerjakan hal yang sama sementara pekerjaan lain tidak tertangani.",
    instruction_note:
      "Terima handover singkat dari leader atau shift sebelumnya. Jangan hanya bertanya 'aman?'; cari tahu meja/order aktif, sold-out, promo, kendala, dan area yang menjadi tanggung jawabmu.",
    shift_codes: ["2K"],
    requires_photo: false,
    is_required_daily: true,
    target_time_start: "11:00",
    target_time_end: "11:15",
    sort_order: 12,
    checklist: [
      "Terima handover dari leader atau shift sebelumnya",
      "Tahu pembagian area/meja yang menjadi tanggung jawab",
      "Tahu menu sold-out atau stok kritis terbaru",
      "Tahu promo dan menu yang sedang didorong",
      "Tahu meja, order, komplain, atau permintaan customer yang masih berjalan",
      "Station dan peralatan service yang dibutuhkan sudah siap",
    ],
  },
  {
    code: "RTPL-W13",
    title: "Shift Takeover & Service Ready",
    category: "Opening",
    position_group: "Waiters",
    standard_result:
      "Masuk shift dengan memahami kondisi outlet, meja/order yang sedang berjalan, dan tanggung jawab area tanpa memulai kerja dalam keadaan buta.",
    why_text:
      "Pergantian shift adalah titik rawan informasi hilang. Waiter yang baru masuk harus tahu apa yang sedang terjadi sebelum mengambil alih pelayanan.",
    operational_impact:
      "Handover yang lemah dapat membuat order terlupa, customer harus mengulang permintaan, komplain terputus, atau pekerjaan menumpuk saat jam ramai.",
    instruction_note:
      "Terima handover singkat dari leader atau shift sebelumnya. Fokus pada kondisi aktual: meja/order aktif, sold-out, promo, kendala, dan area yang menjadi tanggung jawabmu.",
    shift_codes: ["3K"],
    requires_photo: false,
    is_required_daily: true,
    target_time_start: "12:00",
    target_time_end: "12:15",
    sort_order: 13,
    checklist: [
      "Terima handover dari leader atau shift sebelumnya",
      "Tahu pembagian area/meja yang menjadi tanggung jawab",
      "Tahu menu sold-out atau stok kritis terbaru",
      "Tahu promo dan menu yang sedang didorong",
      "Tahu meja, order, komplain, atau permintaan customer yang masih berjalan",
      "Station dan peralatan service yang dibutuhkan sudah siap",
    ],
  },
  {
    code: "RTPL-W14A",
    title: "Area & Service Control",
    category: "Monitoring",
    position_group: "Waiters",
    standard_result:
      "Setelah traffic berjalan, area kembali siap, customer tidak dibiarkan menunggu perhatian, dan order/kendala yang abnormal sudah di-follow up.",
    why_text:
      "Kondisi bagus saat opening tidak bertahan otomatis. Meja kotor, order terlambat, tissue habis, atau customer yang mencari waiter muncul sepanjang operasional.",
    operational_impact:
      "Jika tidak dikontrol, kapasitas meja berkurang, waktu tunggu membesar, customer merasa diabaikan, dan masalah kecil berubah menjadi komplain.",
    instruction_note:
      "Lakukan patrol singkat sambil tetap melayani. Prioritaskan customer dan order aktif; fasilitas yang bermasalah dilaporkan sebagai exception, bukan dibiarkan menunggu checklist berikutnya.",
    shift_codes: ["1K"],
    requires_photo: false,
    is_required_daily: true,
    target_time_start: "13:30",
    target_time_end: "14:00",
    sort_order: 14,
    checklist: [
      "Meja kosong bekas customer sudah di-clear dan di-reset secepat kondisi memungkinkan",
      "Tidak ada customer yang terlihat menunggu perhatian tanpa respons",
      "Order yang melewati waktu normal sudah di-follow up ke kitchen/bar",
      "Piring, gelas, dan sampah customer tidak menumpuk di area service",
      "Tissue, condiment, dan peralatan service area masih cukup",
      "Masalah WC, AC, lampu, meja/kursi, atau fasilitas sudah ditangani atau dilaporkan",
      "Jika outlet ramai dan ada backlog, leader sudah diberi tahu",
    ],
  },
  {
    code: "RTPL-W14B",
    title: "Area & Service Control",
    category: "Monitoring",
    position_group: "Waiters",
    standard_result:
      "Setelah traffic berjalan, area kembali siap, customer tidak dibiarkan menunggu perhatian, dan order/kendala yang abnormal sudah di-follow up.",
    why_text:
      "Kondisi bagus saat awal shift tidak bertahan otomatis. Waiter harus menjaga service state tetap sehat, bukan menunggu masalah terlihat besar.",
    operational_impact:
      "Jika tidak dikontrol, kapasitas meja berkurang, waktu tunggu membesar, customer merasa diabaikan, dan masalah kecil berubah menjadi komplain.",
    instruction_note:
      "Lakukan patrol singkat sambil tetap melayani. Prioritaskan customer dan order aktif; fasilitas yang bermasalah dilaporkan sebagai exception.",
    shift_codes: ["2K"],
    requires_photo: false,
    is_required_daily: true,
    target_time_start: "14:30",
    target_time_end: "15:00",
    sort_order: 14,
    checklist: [
      "Meja kosong bekas customer sudah di-clear dan di-reset secepat kondisi memungkinkan",
      "Tidak ada customer yang terlihat menunggu perhatian tanpa respons",
      "Order yang melewati waktu normal sudah di-follow up ke kitchen/bar",
      "Piring, gelas, dan sampah customer tidak menumpuk di area service",
      "Tissue, condiment, dan peralatan service area masih cukup",
      "Masalah WC, AC, lampu, meja/kursi, atau fasilitas sudah ditangani atau dilaporkan",
      "Jika outlet ramai dan ada backlog, leader sudah diberi tahu",
    ],
  },
  {
    code: "RTPL-W14C",
    title: "Area & Service Control",
    category: "Monitoring",
    position_group: "Waiters",
    standard_result:
      "Setelah traffic berjalan, area kembali siap, customer tidak dibiarkan menunggu perhatian, dan order/kendala yang abnormal sudah di-follow up.",
    why_text:
      "Kondisi bagus saat awal shift tidak bertahan otomatis. Waiter harus menjaga service state tetap sehat menjelang traffic malam.",
    operational_impact:
      "Jika tidak dikontrol, kapasitas meja berkurang, waktu tunggu membesar, customer merasa diabaikan, dan backlog terbawa ke rush hour.",
    instruction_note:
      "Lakukan patrol singkat sambil tetap melayani. Prioritaskan customer dan order aktif; fasilitas yang bermasalah dilaporkan sebagai exception.",
    shift_codes: ["3K"],
    requires_photo: false,
    is_required_daily: true,
    target_time_start: "15:30",
    target_time_end: "16:00",
    sort_order: 14,
    checklist: [
      "Meja kosong bekas customer sudah di-clear dan di-reset secepat kondisi memungkinkan",
      "Tidak ada customer yang terlihat menunggu perhatian tanpa respons",
      "Order yang melewati waktu normal sudah di-follow up ke kitchen/bar",
      "Piring, gelas, dan sampah customer tidak menumpuk di area service",
      "Tissue, condiment, dan peralatan service area masih cukup",
      "Masalah WC, AC, lampu, meja/kursi, atau fasilitas sudah ditangani atau dilaporkan",
      "Jika outlet ramai dan ada backlog, leader sudah diberi tahu",
    ],
  },
  {
    code: "RTPL-W15",
    title: "Rush Preparation",
    category: "Monitoring",
    position_group: "Waiters",
    standard_result:
      "Masuk jam ramai tanpa membawa pekerjaan tertunda: meja, station, informasi menu, reservasi, dan koordinasi kitchen/bar sudah siap.",
    why_text:
      "Masalah kecil yang mudah diselesaikan sebelum rush akan jauh lebih sulit saat semua orang sibuk. Persiapan 10–15 menit mengurangi kerja mengejar keadaan.",
    operational_impact:
      "Masuk rush dengan backlog membuat meja kotor menumpuk, customer menunggu, waiter bolak-balik mencari stok/informasi, dan kitchen/bar menerima follow-up yang terlambat.",
    instruction_note:
      "Bereskan backlog dulu, lalu cek kesiapan informasi dan station. Jika ada keterbatasan stok atau bottleneck, sepakati cara komunikasinya sebelum customer terdampak.",
    shift_codes: ["1K", "2K", "3K"],
    requires_photo: false,
    is_required_daily: true,
    target_time_start: "17:00",
    target_time_end: "17:30",
    sort_order: 15,
    checklist: [
      "Semua meja kosong yang bisa dijual sudah ready",
      "Meja dirty dan pekerjaan service yang tertunda sudah diselesaikan",
      "Tissue, condiment, dan peralatan di station cukup untuk jam ramai",
      "Sold-out, stok kritis, promo, dan menu fokus terbaru sudah diketahui",
      "Cek dengan kitchen/bar jika ada backlog, estimasi lama, atau produk terbatas",
      "Tahu reservasi, group besar, atau kebutuhan customer khusus bila ada",
    ],
  },
  {
    code: "RTPL-W16",
    title: "Closing Shift & Handover",
    category: "Closing",
    position_group: "Waiters",
    standard_result:
      "Shift berikutnya menerima area dan informasi dalam kondisi terkendali tanpa mewarisi pekerjaan atau masalah yang tidak dijelaskan.",
    why_text:
      "Jam kerja boleh selesai, tetapi pelayanan customer dan operasional outlet tetap berjalan. Handover menjaga tanggung jawab berpindah tanpa informasi ikut hilang.",
    operational_impact:
      "Tanpa handover, order dapat terlupa, komplain terputus, pekerjaan ditinggalkan, dan shift berikutnya harus menebak kondisi yang sebenarnya.",
    instruction_note:
      "Selesaikan yang masih bisa diselesaikan sebelum pulang. Untuk yang masih berjalan, serahkan konteks, status, dan PIC penerus secara spesifik—bukan sekadar bilang 'tolong dilanjut'.",
    shift_codes: ["1K"],
    requires_photo: false,
    is_required_daily: true,
    target_time_start: "18:40",
    target_time_end: "19:00",
    sort_order: 16,
    checklist: [
      "Area tanggung jawab tidak meninggalkan meja kotor atau pekerjaan mudah yang belum selesai",
      "Meja/order customer yang masih berjalan sudah diserahterimakan dengan jelas",
      "Komplain atau follow-up terbuka sudah diserahkan ke PIC penerus yang jelas",
      "Kendala fasilitas atau stok yang ditemukan sudah dilaporkan",
      "Station dan peralatan service siap dilanjutkan shift berikutnya",
      "Jika ada pekerjaan belum selesai, tulis singkat apa, statusnya, dan siapa yang melanjutkan",
    ],
  },
  {
    code: "RTPL-W17",
    title: "Closing Shift & Handover",
    category: "Closing",
    position_group: "Waiters",
    standard_result:
      "Shift 3K menerima area dan informasi dalam kondisi terkendali tanpa mewarisi pekerjaan atau masalah yang tidak dijelaskan.",
    why_text:
      "Menjelang akhir operasional, informasi yang hilang makin berisiko karena manpower berkurang. Handover membuat shift terakhir tahu apa yang masih harus dijaga atau diselesaikan.",
    operational_impact:
      "Tanpa handover, order/komplain dapat terlupa, closing terlambat, dan masalah yang seharusnya selesai malam ini terbawa ke besok.",
    instruction_note:
      "Selesaikan yang masih bisa diselesaikan sebelum pulang. Untuk yang masih berjalan, serahkan konteks, status, dan PIC penerus secara spesifik.",
    shift_codes: ["2K"],
    requires_photo: false,
    is_required_daily: true,
    target_time_start: "20:40",
    target_time_end: "21:00",
    sort_order: 17,
    checklist: [
      "Area tanggung jawab tidak meninggalkan meja kotor atau pekerjaan mudah yang belum selesai",
      "Meja/order customer yang masih berjalan sudah diserahterimakan dengan jelas",
      "Komplain atau follow-up terbuka sudah diserahkan ke PIC 3K/leader yang jelas",
      "Kendala fasilitas atau stok yang ditemukan sudah dilaporkan",
      "Station dan peralatan service siap dilanjutkan shift terakhir",
      "Jika ada pekerjaan belum selesai, tulis singkat apa, statusnya, dan siapa yang melanjutkan",
    ],
  },
  {
    code: "RTPL-W18",
    title: "Final Closing Outlet",
    category: "Closing",
    position_group: "Waiters",
    standard_result:
      "Area customer ditinggalkan aman, rapi, terkendali, dan siap mendukung opening besok tanpa masalah operasional yang disembunyikan.",
    why_text:
      "Final closing adalah reset terakhir outlet. Tujuannya bukan hanya terlihat bersih malam ini, tetapi memastikan tim besok tidak memulai hari dengan pekerjaan, kerusakan, atau informasi yang tertinggal.",
    operational_impact:
      "Closing yang lemah membuat opening besok terlambat, aset/barang customer bisa terlewat, fasilitas rusak tidak tertangani, dan standar outlet turun dari hari ke hari.",
    instruction_note:
      "Lakukan final walk-through setelah service selesai. Foto kondisi akhir secara luas. Hal yang belum bisa diperbaiki malam ini wajib dicatat agar punya PIC, bukan dianggap selesai.",
    shift_codes: ["3K"],
    requires_photo: true,
    is_required_daily: true,
    target_time_start: "21:30",
    target_time_end: "22:00",
    sort_order: 18,
    checklist: [
      "Semua customer/order sudah selesai atau status akhirnya sudah diketahui leader",
      "Semua meja customer sudah di-clear, dibersihkan, dan dirapikan",
      "Area customer dan station service tidak meninggalkan alat, piring, gelas, atau sampah",
      "WC/customer area sudah final check atau kendalanya sudah dilaporkan",
      "Tidak ada barang customer tertinggal tanpa diamankan dan dilaporkan",
      "Kerusakan meja/kursi, AC, lampu, atau fasilitas untuk besok sudah dilaporkan",
      "Lampu, AC, musik, pintu, dan area diamankan sesuai SOP outlet",
      "Foto akhir menunjukkan kondisi area secara luas dan aktual",
    ],
  },
];

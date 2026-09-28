/**
 * Koordinasi SOP: "kalau ada masalah, hubungi siapa" per posisi, plus copy
 * instruction-first bawaan per kategori untuk template yang belum punya.
 * Murni (tanpa DB) supaya bisa dites & dipakai client/server.
 */

export type CoordinationRule = {
  /** Situasi yang dilihat staff di lapangan. */
  when: string;
  /** Posisi yang dihubungi (urut prioritas). */
  to: string[];
  /** Segera — jangan tunggu selesai kegiatan. */
  urgent?: boolean;
};

const SAFETY: CoordinationRule = {
  when: "Ada kecelakaan kerja, bau gas, korsleting, atau kondisi berbahaya",
  to: ["LeaderOutlet", "Maintenance"],
  urgent: true,
};

const BROKEN: CoordinationRule = {
  when: "Alat / fasilitas rusak (kompor, mesin, AC, lampu, air, listrik)",
  to: ["Maintenance", "LeaderOutlet"],
};

const BY_POSITION: Record<string, CoordinationRule[]> = {
  Dapur: [
    { when: "Bahan habis / menipis atau kualitas bahan tidak layak", to: ["LeaderOutlet", "Purchasing"] },
    { when: "Menu tidak bisa dibuat (sold-out)", to: ["Kasir", "Waiters"], urgent: true },
    { when: "Order menumpuk / keluar terlambat", to: ["LeaderOutlet"] },
    BROKEN,
    SAFETY,
  ],
  Bar: [
    { when: "Bahan habis / menipis (kopi, susu, sirup, cup, es)", to: ["LeaderOutlet", "Purchasing"] },
    { when: "Menu minuman tidak bisa dibuat (sold-out)", to: ["Kasir", "Waiters"], urgent: true },
    { when: "Mesin kopi / grinder / blender bermasalah", to: ["Maintenance", "LeaderOutlet"] },
    SAFETY,
  ],
  Kasir: [
    { when: "Selisih uang atau pembayaran bermasalah (EDC, QRIS, transfer)", to: ["LeaderOutlet", "Finance"], urgent: true },
    { when: "Komplain customer", to: ["LeaderOutlet"], urgent: true },
    { when: "Info menu sold-out belum jelas", to: ["Dapur", "Bar"] },
    BROKEN,
  ],
  Waiters: [
    { when: "Komplain customer atau pesanan terlalu lama", to: ["LeaderOutlet"], urgent: true },
    { when: "Pesanan salah / kurang", to: ["Dapur", "Bar"] },
    { when: "Meja, area, atau WC kotor", to: ["PA"] },
    { when: "Barang customer tertinggal", to: ["LeaderOutlet"] },
    BROKEN,
  ],
  PA: [
    { when: "Sabun, tisu, atau alat kebersihan habis", to: ["LeaderOutlet", "Purchasing"] },
    { when: "Saluran mampet, bocor, atau fasilitas rusak", to: ["Maintenance", "LeaderOutlet"] },
    SAFETY,
  ],
  LeaderOutlet: [
    { when: "Belanja / stok mendesak", to: ["Purchasing"] },
    { when: "Selisih kas atau masalah keuangan", to: ["Finance"] },
    { when: "Kerusakan yang mengganggu operasional", to: ["Maintenance"], urgent: true },
    SAFETY,
  ],
  Purchasing: [
    { when: "Barang tidak tersedia di supplier atau harga naik jauh", to: ["LeaderOutlet", "Finance"] },
    { when: "Dana belanja tidak cukup", to: ["Finance"] },
  ],
  Gudang: [
    { when: "Stok di bawah batas minimum", to: ["Purchasing"] },
    { when: "Barang rusak / mendekati expired", to: ["LeaderOutlet", "Purchasing"] },
  ],
  ProduksiFnB: [
    { when: "Bahan produksi habis / menipis", to: ["Purchasing", "Gudang"] },
    { when: "Hasil produksi tidak sesuai standar", to: ["LeaderOutlet"] },
    BROKEN,
    SAFETY,
  ],
  Maintenance: [
    { when: "Butuh beli sparepart / material", to: ["Purchasing"] },
    { when: "Perbaikan harus menghentikan operasional", to: ["LeaderOutlet"], urgent: true },
    SAFETY,
  ],
  SupirPA: [
    { when: "Kendaraan bermasalah", to: ["Maintenance", "LeaderOutlet"] },
    { when: "Pengiriman / jemputan terlambat", to: ["LeaderOutlet"], urgent: true },
  ],
};
BY_POSITION.ProduksiNF = BY_POSITION.ProduksiFnB;
BY_POSITION.ProduksiFishing = BY_POSITION.ProduksiFnB;
BY_POSITION.MaintenanceKebon = BY_POSITION.Maintenance;

const OFFICE_DEFAULT: CoordinationRule[] = [
  { when: "Pekerjaan terhambat / butuh keputusan", to: ["LeaderOutlet"] },
];

/** Posisi yang biasanya ada di pusat (GENERAL) bila outlet tidak punya. */
export const CENTRAL_POSITIONS = ["Purchasing", "Finance", "Maintenance", "MaintenanceKebon", "Gudang"];

export function coordinationRulesFor(positionGroup?: string | null): CoordinationRule[] {
  return BY_POSITION[positionGroup ?? ""] ?? OFFICE_DEFAULT;
}

export type Contact = { staff_id: string; name: string; wa_link: string; shift?: string | null };

/** Posisi → siapa yang bertugas hari ini (sudah dibatasi outlet / pusat). */
export type ContactDirectory = Record<string, Contact[]>;

export type ResolvedRule = CoordinationRule & {
  targets: { position: string; contacts: Contact[] }[];
};

export function resolveCoordination(
  rules: CoordinationRule[],
  directory: ContactDirectory,
  selfStaffId?: string,
): ResolvedRule[] {
  return rules.map((rule) => ({
    ...rule,
    targets: rule.to.map((position) => ({
      position,
      contacts: (directory[position] ?? []).filter((c) => c.staff_id !== selfStaffId),
    })),
  }));
}

/** Copy bawaan bila template belum punya "kenapa / dampak / cara kerja". */
const CATEGORY_DEFAULTS: Record<string, { why: string; impact: string; how: string }> = {
  Opening: {
    why: "Outlet harus siap sebelum customer pertama datang. Yang terlewat saat opening biasanya baru ketahuan ketika sudah ramai.",
    impact: "Customer menunggu, menu yang tidak siap tetap ditawarkan, dan pekerjaan tertunda menumpuk di jam sibuk.",
    how: "Cek dari sudut pandang customer dan rekan shift berikutnya. Yang bisa langsung dibereskan, bereskan; yang di luar kewenanganmu, laporkan sekarang ke orang yang tepat di bagian Koordinasi.",
  },
  Closing: {
    why: "Closing menentukan kondisi opening besok. Yang ditinggal kotor atau rusak malam ini akan jadi masalah shift pagi.",
    impact: "Opening besok terlambat, bahan/alat rusak karena tidak diamankan, dan masalah tidak punya PIC.",
    how: "Lakukan pengecekan akhir secara menyeluruh, foto kondisi luas dan asli. Hal yang belum selesai wajib dicatat dan diserahkan ke orang yang jelas.",
  },
  Stock: {
    why: "Stok yang tidak dicek membuat menu mendadak habis atau bahan terbuang karena expired.",
    impact: "Menu sold-out di jam ramai, belanja mendadak lebih mahal, dan bahan terbuang.",
    how: "Hitung / cek sesuai urutan FIFO. Stok di bawah batas minimum langsung laporkan ke Purchasing / Leader, jangan tunggu habis.",
  },
  Cleaning: {
    why: "Kebersihan adalah standar yang dinilai customer dan syarat keamanan makanan.",
    impact: "Customer tidak nyaman, risiko kontaminasi, dan pekerjaan membersihkan jadi lebih berat esok hari.",
    how: "Bersihkan sampai standar yang bisa dibuktikan dari foto. Kalau alat/bahan kebersihan habis atau ada kerusakan, laporkan lewat bagian Koordinasi.",
  },
  Maintenance: {
    why: "Kerusakan kecil yang dibiarkan berubah jadi kerusakan besar yang menghentikan operasional.",
    impact: "Alat mati saat jam sibuk, biaya perbaikan membengkak, dan risiko keselamatan kerja.",
    how: "Cek fungsi alat dengan aman (matikan listrik/gas bila perlu). Temuan apa pun dicatat dan dilaporkan, jangan diperbaiki sendiri bila di luar kemampuan.",
  },
  Production: {
    why: "Produksi yang sesuai standar menjaga rasa dan porsi tetap konsisten di semua outlet.",
    impact: "Rasa berubah-ubah, bahan terbuang, dan stok siap jual tidak cukup.",
    how: "Ikuti resep & SOP higienitas, beri label tanggal. Hasil yang tidak sesuai standar jangan dikirim — laporkan dulu.",
  },
  Monitoring: {
    why: "Kondisi yang bagus di awal shift tidak bertahan sendiri; perlu dicek ulang saat berjalan.",
    impact: "Masalah kecil membesar tanpa ada yang sadar sampai customer mengeluh.",
    how: "Keliling area dengan sudut pandang customer. Temuan langsung diselesaikan atau diteruskan ke orang yang tepat.",
  },
};

const GENERAL_DEFAULT = {
  why: "Kegiatan ini menjaga operasional tetap sesuai standar dan tidak bergantung pada ingatan satu orang.",
  impact: "Pekerjaan terlewat, rekan kerja harus menebak kondisi, dan masalah baru ketahuan saat sudah besar.",
  how: "Kerjakan sesuai langkah di bawah. Centang hanya yang benar-benar selesai, dan laporkan kendala apa adanya.",
};

export function defaultInstruction(category?: string | null): { why: string; impact: string; how: string } {
  return CATEGORY_DEFAULTS[category ?? ""] ?? GENERAL_DEFAULT;
}

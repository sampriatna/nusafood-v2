export type DailyReportRouteType =
  | "safety"
  | "maintenance"
  | "cleaning"
  | "finance"
  | "purchasing"
  | "stock"
  | "service"
  | "other";

export type DailyReportIssueLanguage = {
  seed_id: string;
  subject: string;
  problem: string;
  steps: string[];
  standards: string[];
};

type DailyReportIssueLanguageSeed = DailyReportIssueLanguage & {
  route_type: DailyReportRouteType;
  match_terms: string[];
};

/**
 * Bahasa operasional baku untuk task hasil kendala SOP.
 *
 * Catatan staff tetap disimpan sebagai laporan asli, tetapi PIC menerima judul,
 * langkah kerja, dan standar selesai yang konsisten walaupun bahasa pelapor singkat
 * atau tidak rapi.
 */
export const DAILY_REPORT_ISSUE_LANGUAGE_SEEDS: DailyReportIssueLanguageSeed[] = [
  {
    seed_id: "maintenance-coffee-grinder",
    route_type: "maintenance",
    match_terms: ["mesin kopi", "espresso", "grinder", "kalibrasi"],
    subject: "Mesin Kopi & Grinder",
    problem: "Peralatan bar perlu diperiksa karena ada indikasi gangguan fungsi atau kalibrasi yang tidak sesuai.",
    steps: [
      "Cek kondisi fisik, kebersihan, suara, dan fungsi mesin kopi serta grinder.",
      "Lakukan maintenance atau pembersihan yang memang diperlukan.",
      "Kalibrasi grinder dan uji hasil gilingan sampai konsisten.",
      "Uji fungsi mesin kopi dan pastikan kedua alat aman dipakai.",
      "Upload foto hasil dan tulis tindakan yang sudah dilakukan.",
    ],
    standards: [
      "Mesin kopi berfungsi normal dan aman dipakai.",
      "Grinder terkalibrasi dan hasil gilingan stabil.",
      "Ada foto hasil dan catatan tindakan.",
    ],
  },
  {
    seed_id: "maintenance-refrigeration",
    route_type: "maintenance",
    match_terms: ["freezer", "chiller", "kulkas", "dingin", "suhu"],
    subject: "Freezer / Chiller",
    problem: "Peralatan pendingin perlu diperiksa karena suhu atau fungsi operasionalnya tidak sesuai kondisi normal.",
    steps: [
      "Cek suhu aktual, listrik, pintu, karet seal, dan kondisi unit.",
      "Periksa sumber gangguan yang bisa ditangani tanpa membongkar komponen berisiko.",
      "Lakukan tindakan ringan yang aman dan diperlukan.",
      "Uji kembali suhu dan fungsi unit setelah tindakan.",
      "Jika perlu teknisi atau sparepart, tulis kebutuhan dan kondisi terakhir di laporan.",
    ],
    standards: [
      "Unit kembali bekerja normal atau penyebab gangguan sudah teridentifikasi.",
      "Produk di dalam unit tetap aman sesuai kebutuhan operasional.",
      "Kebutuhan teknisi/sparepart tercatat jika belum selesai.",
    ],
  },
  {
    seed_id: "maintenance-ac",
    route_type: "maintenance",
    match_terms: ["ac ", "air conditioner", "acnya", "ac-nya"],
    subject: "AC",
    problem: "AC perlu diperiksa karena kenyamanan atau fungsi pendinginan tidak sesuai kondisi normal.",
    steps: [
      "Cek daya, remote, setting suhu, aliran udara, dan kondisi unit.",
      "Bersihkan bagian yang aman dibersihkan jika kotor menjadi penyebab.",
      "Uji kembali pendinginan dan suara unit.",
      "Catat jika membutuhkan servis teknisi, freon, atau sparepart.",
    ],
    standards: [
      "AC menyala dan mendinginkan dengan normal, atau penyebab masalah sudah jelas.",
      "Tidak ada kondisi listrik atau kebocoran yang membahayakan.",
    ],
  },
  {
    seed_id: "maintenance-plumbing",
    route_type: "maintenance",
    match_terms: ["pompa", "keran", "bocor", "mampet", "saluran", "air tidak"],
    subject: "Air / Plumbing",
    problem: "Sistem air atau saluran perlu diperiksa karena ada kebocoran, sumbatan, atau aliran yang tidak normal.",
    steps: [
      "Cek titik masalah dan pastikan sumber air atau saluran yang terdampak.",
      "Amankan area agar tidak licin, banjir, atau mengganggu operasional.",
      "Lakukan perbaikan atau pembersihan saluran yang aman dilakukan.",
      "Uji aliran air dan pastikan tidak ada kebocoran setelah tindakan.",
      "Catat kebutuhan material/sparepart jika belum bisa selesai.",
    ],
    standards: [
      "Aliran air normal dan tidak ada kebocoran aktif.",
      "Area kembali aman dan bersih.",
      "Kebutuhan lanjutan tercatat jika pekerjaan belum selesai.",
    ],
  },
  {
    seed_id: "maintenance-electrical",
    route_type: "maintenance",
    match_terms: ["lampu", "listrik", "stop kontak", "saklar", "kabel"],
    subject: "Kelistrikan",
    problem: "Peralatan atau instalasi listrik perlu diperiksa karena tidak berfungsi normal atau berpotensi mengganggu operasional.",
    steps: [
      "Matikan atau amankan sumber listrik jika ada risiko.",
      "Cek lampu, kabel, saklar, stop kontak, atau titik gangguan terkait.",
      "Lakukan penggantian/perbaikan ringan hanya jika aman dan sesuai kemampuan.",
      "Uji fungsi kembali setelah tindakan.",
      "Jika ada risiko korsleting atau perlu teknisi, hentikan penggunaan dan catat kebutuhan lanjutan.",
    ],
    standards: [
      "Peralatan kembali berfungsi normal atau area sudah diamankan.",
      "Tidak ada kabel terbuka, panas berlebih, atau kondisi berbahaya.",
    ],
  },
  {
    seed_id: "maintenance-kitchen-equipment",
    route_type: "maintenance",
    match_terms: ["kompor", "oven", "blender", "printer", "engsel", "mesin"],
    subject: "Peralatan / Fasilitas",
    problem: "Peralatan atau fasilitas perlu diperiksa karena fungsi operasionalnya tidak normal.",
    steps: [
      "Cek kondisi fisik dan fungsi alat/fasilitas yang dilaporkan.",
      "Tentukan penyebab yang paling mungkin dan tindakan yang aman dilakukan.",
      "Lakukan perbaikan ringan, penyetelan, atau pembersihan yang diperlukan.",
      "Uji fungsi kembali setelah tindakan.",
      "Upload foto hasil dan catat sparepart/biaya/bantuan lain jika dibutuhkan.",
    ],
    standards: [
      "Alat/fasilitas kembali berfungsi normal atau sudah aman untuk tidak digunakan.",
      "Status pekerjaan dan kebutuhan lanjutan tercatat jelas.",
    ],
  },
  {
    seed_id: "cleaning-toilet",
    route_type: "cleaning",
    match_terms: ["toilet", " wc ", "bau pesing", "kamar mandi"],
    subject: "Toilet",
    problem: "Kondisi toilet belum memenuhi standar kebersihan dan perlu segera ditangani.",
    steps: [
      "Cek lantai, kloset, wastafel, kaca, tempat sampah, dan sumber bau.",
      "Bersihkan area yang kotor dan buang sampah.",
      "Pastikan lantai tidak licin dan perlengkapan toilet tersedia.",
      "Cek ulang bau dan kondisi keseluruhan sebelum selesai.",
      "Upload foto kondisi akhir.",
    ],
    standards: [
      "Toilet bersih, tidak berbau menyengat, dan aman digunakan.",
      "Lantai kering/tidak licin dan sampah sudah dibuang.",
    ],
  },
  {
    seed_id: "cleaning-area",
    route_type: "cleaning",
    match_terms: ["kotor", "sampah", "lantai", "meja", "becek", "berantakan", "kebersihan"],
    subject: "Kebersihan Area",
    problem: "Area operasional belum memenuhi standar kebersihan atau kerapian outlet.",
    steps: [
      "Cek area yang dilaporkan dan tentukan sumber kotor/berantakan.",
      "Bersihkan sampah, noda, tumpahan, atau barang yang tidak pada tempatnya.",
      "Rapikan area agar jalur kerja dan pelanggan tidak terganggu.",
      "Cek ulang kondisi akhir dan upload foto jika diperlukan.",
    ],
    standards: [
      "Area bersih, rapi, tidak licin, dan tidak mengganggu operasional.",
    ],
  },
  {
    seed_id: "finance-qris-edc",
    route_type: "finance",
    match_terms: ["qris", "edc", "transfer", "pembayaran"],
    subject: "Pembayaran Digital",
    problem: "Transaksi pembayaran perlu dicek karena status atau nilainya belum jelas/bermasalah.",
    steps: [
      "Cek nominal, waktu transaksi, bukti pembayaran, dan transaksi di sistem.",
      "Cocokkan dengan mutasi/EDC/QRIS sesuai metode pembayaran.",
      "Tentukan apakah transaksi berhasil, pending, dobel, atau belum masuk.",
      "Catat hasil pengecekan dan tindakan koreksi bila diperlukan.",
    ],
    standards: [
      "Status transaksi dan nominal sudah jelas serta terdokumentasi.",
      "Tidak ada selisih yang dibiarkan tanpa tindak lanjut.",
    ],
  },
  {
    seed_id: "finance-cash-difference",
    route_type: "finance",
    match_terms: ["selisih kas", "selisih uang", "uang kurang", "cash", "kas kurang"],
    subject: "Selisih Kas",
    problem: "Kas perlu dicocokkan karena ada selisih antara uang fisik dan catatan transaksi.",
    steps: [
      "Hitung ulang uang fisik dan pisahkan per pecahan/metode pembayaran.",
      "Cocokkan dengan POS, transaksi void/refund, dan catatan shift.",
      "Telusuri transaksi yang paling mungkin menyebabkan selisih.",
      "Catat nominal selisih, penyebab jika ditemukan, dan bukti pendukung.",
      "Eskalasi jika selisih belum terjelaskan.",
    ],
    standards: [
      "Nominal kas sudah cocok atau selisih tercatat lengkap dengan bukti dan tindak lanjut.",
    ],
  },
  {
    seed_id: "purchasing-sparepart",
    route_type: "purchasing",
    match_terms: ["sparepart", "spare part", "material", "komponen"],
    subject: "Sparepart / Material",
    problem: "Ada kebutuhan sparepart atau material agar pekerjaan operasional dapat dilanjutkan.",
    steps: [
      "Konfirmasi barang yang dibutuhkan, jumlah, ukuran, dan spesifikasinya.",
      "Cek apakah stok internal masih tersedia.",
      "Jika tidak ada, cari opsi pembelian yang sesuai kebutuhan dan harga wajar.",
      "Koordinasikan persetujuan bila nilai pembelian memerlukan approval.",
      "Catat status pengadaan dan estimasi barang tersedia.",
    ],
    standards: [
      "Barang yang dibutuhkan jelas spesifikasi/jumlahnya.",
      "Status stok/pembelian dan estimasi penyelesaian tercatat.",
    ],
  },
  {
    seed_id: "purchasing-general",
    route_type: "purchasing",
    match_terms: ["perlu beli", "harus beli", "minta beli", "belanja", "pengadaan"],
    subject: "Pengadaan Barang",
    problem: "Outlet membutuhkan barang yang belum tersedia dan perlu ditindaklanjuti melalui pengadaan.",
    steps: [
      "Konfirmasi nama barang, jumlah, spesifikasi, dan urgensinya.",
      "Cek stok internal atau alternatif barang yang masih tersedia.",
      "Lakukan pembelian/pengadaan sesuai prosedur dan batas approval.",
      "Informasikan status dan estimasi barang sampai ke outlet.",
    ],
    standards: [
      "Kebutuhan barang terkonfirmasi dan status pengadaan jelas.",
    ],
  },
  {
    seed_id: "stock-shortage",
    route_type: "stock",
    match_terms: ["stok", "stock", "habis", "menipis", "sold out", "cup", "susu", "sirup", "es"],
    subject: "Stok Bahan",
    problem: "Stok bahan atau perlengkapan operasional menipis/habis dan berisiko mengganggu penjualan.",
    steps: [
      "Cek stok fisik dan jumlah kebutuhan sampai pengiriman/pembelian berikutnya.",
      "Cek stok gudang atau outlet lain yang bisa dipindahkan jika memungkinkan.",
      "Koordinasikan pemenuhan ke Gudang/Purchasing sesuai kebutuhan.",
      "Catat jumlah yang tersedia, jumlah yang dibutuhkan, dan estimasi pemenuhan.",
    ],
    standards: [
      "Jumlah stok aktual dan kebutuhan sudah jelas.",
      "Ada rencana pemenuhan sebelum operasional terganggu.",
    ],
  },
  {
    seed_id: "service-order",
    route_type: "service",
    match_terms: ["pesanan", "order", "salah pesanan", "pesanan salah", "pesanan kurang", "lama"],
    subject: "Pesanan Customer",
    problem: "Ada kendala pada pesanan customer yang perlu dikoordinasikan antarbagian sampai selesai.",
    steps: [
      "Cek nomor/meja pesanan dan item yang bermasalah.",
      "Konfirmasi kondisi ke bagian yang menyiapkan atau mengantar pesanan.",
      "Selesaikan kekurangan/kesalahan pesanan secepatnya.",
      "Informasikan status ke customer bila masih menunggu.",
      "Catat penyebab jika masalah berulang agar bisa diperbaiki.",
    ],
    standards: [
      "Pesanan customer sudah benar/lengkap atau solusi sudah diberikan.",
      "Status terakhir diketahui semua bagian terkait.",
    ],
  },
  {
    seed_id: "service-complaint",
    route_type: "service",
    match_terms: ["komplain", "complaint", "customer", "pelanggan"],
    subject: "Keluhan Customer",
    problem: "Ada keluhan customer yang perlu ditangani dan dikoordinasikan sampai ada penyelesaian jelas.",
    steps: [
      "Dengarkan dan catat inti keluhan tanpa berdebat.",
      "Cek fakta ke bagian terkait.",
      "Berikan solusi sesuai kewenangan atau eskalasi jika perlu keputusan.",
      "Pastikan customer menerima informasi hasil penanganan.",
      "Catat penyebab dan tindak lanjut agar tidak berulang.",
    ],
    standards: [
      "Keluhan mendapat respons dan status penyelesaian yang jelas.",
    ],
  },
  {
    seed_id: "safety-electrical-gas",
    route_type: "safety",
    match_terms: ["korslet", "korsleting", "bau gas", "gas bocor", "kesetrum", "percikan api", "kabel terbuka", "terbakar"],
    subject: "Kondisi Berbahaya",
    problem: "Ada kondisi yang berpotensi membahayakan staff, customer, atau aset dan harus diamankan sebelum pekerjaan lain dilanjutkan.",
    steps: [
      "Hentikan penggunaan alat/area yang berbahaya.",
      "Jauhkan staff/customer dari titik risiko dan matikan sumber listrik/gas jika aman dilakukan.",
      "Hubungi Maintenance dan Leader untuk penanganan segera.",
      "Jangan operasikan kembali sebelum kondisi dinyatakan aman.",
      "Dokumentasikan kondisi awal dan hasil penanganan.",
    ],
    standards: [
      "Sumber bahaya sudah dihentikan atau area sudah diisolasi.",
      "Tidak ada penggunaan ulang sebelum kondisi aman.",
    ],
  },
];

const FALLBACK_LANGUAGE: Record<DailyReportRouteType, DailyReportIssueLanguage> = {
  maintenance: {
    seed_id: "maintenance-fallback",
    subject: "Peralatan / Fasilitas",
    problem: "Ada peralatan atau fasilitas yang perlu diperiksa agar operasional kembali normal.",
    steps: [
      "Cek kondisi dan fungsi bagian yang dilaporkan.",
      "Identifikasi penyebab dan lakukan tindakan yang aman sesuai kemampuan.",
      "Uji kembali fungsi setelah tindakan.",
      "Upload foto hasil dan catat kebutuhan sparepart/teknisi jika belum selesai.",
    ],
    standards: ["Masalah selesai atau status, penyebab, dan kebutuhan lanjut tercatat jelas."],
  },
  cleaning: {
    seed_id: "cleaning-fallback",
    subject: "Kebersihan & Area",
    problem: "Ada area yang perlu dibersihkan atau dirapikan agar kembali sesuai standar outlet.",
    steps: [
      "Cek area yang dilaporkan.",
      "Bersihkan dan rapikan sampai tidak mengganggu operasional.",
      "Cek ulang kondisi akhir dan dokumentasikan bila diperlukan.",
    ],
    standards: ["Area bersih, rapi, aman, dan siap digunakan."],
  },
  finance: {
    seed_id: "finance-fallback",
    subject: "Kas & Pembayaran",
    problem: "Ada transaksi atau kas yang perlu dicocokkan agar nilainya jelas dan tidak menimbulkan selisih.",
    steps: [
      "Cek transaksi, nominal, waktu, dan bukti terkait.",
      "Cocokkan dengan sistem/mutasi/catatan kas.",
      "Catat hasil dan eskalasi jika masih ada selisih.",
    ],
    standards: ["Status transaksi/kas jelas dan bukti pendukung tercatat."],
  },
  purchasing: {
    seed_id: "purchasing-fallback",
    subject: "Belanja & Pengadaan",
    problem: "Ada kebutuhan barang yang perlu dikonfirmasi dan dipenuhi sesuai prosedur.",
    steps: [
      "Konfirmasi barang, jumlah, spesifikasi, dan urgensi.",
      "Cek stok internal sebelum membeli.",
      "Lanjutkan pengadaan sesuai approval yang berlaku.",
      "Catat status dan estimasi barang tersedia.",
    ],
    standards: ["Kebutuhan dan status pengadaan jelas."],
  },
  stock: {
    seed_id: "stock-fallback",
    subject: "Stok & Bahan",
    problem: "Ada stok bahan/perlengkapan yang perlu dicek agar operasional tidak terganggu.",
    steps: [
      "Cek stok fisik dan kebutuhan outlet.",
      "Cek sumber stok pengganti dari gudang/outlet lain.",
      "Koordinasikan pemenuhan dan catat estimasinya.",
    ],
    standards: ["Stok aktual dan rencana pemenuhan tercatat jelas."],
  },
  service: {
    seed_id: "service-fallback",
    subject: "Pelayanan & Operasional",
    problem: "Ada kendala operasional/pelayanan yang membutuhkan koordinasi antarbagian.",
    steps: [
      "Cek fakta dan bagian yang terkait.",
      "Koordinasikan penyelesaian langsung dengan bagian terkait.",
      "Pastikan status akhir diketahui pelapor dan pihak yang terdampak.",
      "Catat penyebab jika perlu pencegahan agar tidak berulang.",
    ],
    standards: ["Kendala selesai atau status tindak lanjutnya jelas."],
  },
  safety: {
    seed_id: "safety-fallback",
    subject: "Keselamatan",
    problem: "Ada kondisi berisiko yang harus diamankan sebelum operasional dilanjutkan.",
    steps: [
      "Hentikan aktivitas pada titik berbahaya.",
      "Amankan orang dan area dari sumber risiko.",
      "Hubungi Maintenance/Leader untuk penanganan segera.",
      "Dokumentasikan hasil dan jangan gunakan kembali sebelum aman.",
    ],
    standards: ["Sumber risiko sudah diamankan dan tidak membahayakan operasional."],
  },
  other: {
    seed_id: "other-fallback",
    subject: "Tindak Lanjut Operasional",
    problem: "Ada temuan yang membutuhkan tindak lanjut dan klarifikasi dari bagian terkait.",
    steps: [
      "Baca laporan asli dan cek kondisi di lapangan.",
      "Konfirmasi ke pelapor jika informasi belum cukup.",
      "Koordinasikan ke bagian yang paling tepat.",
      "Catat hasil atau keputusan tindak lanjut.",
    ],
    standards: ["PIC, status, dan tindak lanjut temuan sudah jelas."],
  },
};

function normalizeText(value: string): string {
  return ` ${value.toLowerCase().replace(/\s+/g, " ")} `;
}

export function resolveDailyReportIssueLanguage(input: {
  routeType: DailyReportRouteType;
  note: string;
  activityTitle: string;
}): DailyReportIssueLanguage {
  const text = normalizeText(`${input.activityTitle} ${input.note}`);
  const candidates = DAILY_REPORT_ISSUE_LANGUAGE_SEEDS.filter(
    (seed) => seed.route_type === input.routeType,
  )
    .map((seed) => ({
      seed,
      score: seed.match_terms.reduce(
        (total, term) => total + (text.includes(term.toLowerCase()) ? 1 : 0),
        0,
      ),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || b.seed.match_terms.length - a.seed.match_terms.length);

  const matched = candidates[0]?.seed;
  if (!matched) return FALLBACK_LANGUAGE[input.routeType];

  return {
    seed_id: matched.seed_id,
    subject: matched.subject,
    problem: matched.problem,
    steps: matched.steps,
    standards: matched.standards,
  };
}

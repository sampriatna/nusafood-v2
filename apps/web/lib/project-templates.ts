/** Template struktur project (tanpa PIC, tanggal, bukti, progress). Murni, bisa dites. */

export type TemplateStep = { text: string; required?: boolean; evidence?: boolean };
export type TemplateMilestone = { title: string; description?: string; weight?: number; steps: TemplateStep[] };
export type TemplateWorkstream = { name: string; weight?: number; milestones: TemplateMilestone[] };
export type ProjectStructure = { workstreams: TemplateWorkstream[] };

export type ProjectTemplate = {
  id: string;
  name: string;
  description: string;
  structure: ProjectStructure;
};

const s = (text: string, evidence = false): TemplateStep => ({ text, evidence });

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "produk-baru",
    name: "Produk Baru",
    description: "Dari riset sampai produk siap dijual.",
    structure: {
      workstreams: [
        {
          name: "Eksekusi Utama",
          milestones: [
            { title: "Riset & Konsep", steps: [s("Tentukan target pasar"), s("Kumpulkan referensi produk sejenis"), s("Tulis konsep & keunggulan produk")] },
            { title: "Uji Coba & HPP", steps: [s("Uji coba resep / prototipe", true), s("Hitung HPP"), s("Tentukan harga jual")] },
            { title: "SOP & Persiapan Produksi", steps: [s("Tulis SOP produksi"), s("Siapkan bahan & alat"), s("Latih tim")] },
            { title: "Foto & Materi Promosi", steps: [s("Foto produk", true), s("Tulis deskripsi produk")] },
            { title: "Peluncuran", steps: [s("Mulai penjualan"), s("Catat penjualan pertama", true)] },
          ],
        },
      ],
    },
  },
  {
    id: "outlet-baru",
    name: "Outlet Baru",
    description: "Persiapan buka outlet: lokasi, renovasi, tim, opening.",
    structure: {
      workstreams: [
        { name: "Lokasi & Perizinan", milestones: [{ title: "Lokasi disepakati", steps: [s("Survei lokasi", true), s("Negosiasi sewa"), s("Tanda tangan kontrak", true)] }, { title: "Perizinan beres", steps: [s("Urus izin usaha"), s("Urus izin lingkungan")] }] },
        { name: "Renovasi & Peralatan", milestones: [{ title: "Renovasi selesai", steps: [s("Finalisasi desain"), s("Pengerjaan renovasi", true), s("Serah terima pekerjaan")] }, { title: "Peralatan terpasang", steps: [s("Beli peralatan dapur & bar"), s("Pasang & uji alat", true)] }] },
        { name: "Tim & Operasional", milestones: [{ title: "Tim siap", steps: [s("Rekrut staf"), s("Pelatihan staf"), s("Susun jadwal shift")] }, { title: "Soft opening", steps: [s("Simulasi layanan"), s("Soft opening", true), s("Catat evaluasi")] }] },
      ],
    },
  },
  {
    id: "listing-marketplace",
    name: "Listing Marketplace",
    description: "Mendata SKU, foto, harga, sampai listing aktif.",
    structure: {
      workstreams: [
        {
          name: "Eksekusi Utama",
          milestones: [
            { title: "Mapping Produk", steps: [s("Daftar semua SKU"), s("Catat ukuran / varian"), s("Harga modal"), s("Harga jual"), s("Foto produk", true)] },
            { title: "Listing", steps: [s("Judul listing"), s("Deskripsi"), s("Upload ke marketplace", true)] },
            { title: "Packing & Pengiriman", steps: [s("Pilih kemasan"), s("Simulasi packing", true)] },
            { title: "Penjualan Pertama", steps: [s("Order pertama"), s("Kirim pesanan"), s("Bukti resi", true)] },
          ],
        },
      ],
    },
  },
];

export function getTemplate(id: string): ProjectTemplate | null {
  return PROJECT_TEMPLATES.find((t) => t.id === id) ?? null;
}

/** Struktur valid = ada bagian, tiap bagian punya milestone, tiap milestone punya langkah. */
export function validateStructure(structure: ProjectStructure): string[] {
  const problems: string[] = [];
  if (!structure.workstreams.length) problems.push("Tidak ada bagian kerja");
  const names = new Set<string>();
  for (const ws of structure.workstreams) {
    const key = ws.name.trim().toLowerCase();
    if (names.has(key)) problems.push(`Nama bagian ganda: ${ws.name}`);
    names.add(key);
    if (!ws.milestones.length) problems.push(`Bagian "${ws.name}" tanpa milestone`);
    for (const m of ws.milestones) {
      if (!m.steps.length) problems.push(`Milestone "${m.title}" tanpa langkah`);
    }
  }
  return problems;
}

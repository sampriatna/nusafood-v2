/**
 * Tambah outlet GENERAL (pusat) + NUSAFISHING beserta area masing-masing.
 * Aman dijalankan ulang — upsert only, tidak menghapus area lama.
 *
 * Usage: pnpm exec tsx scripts/seed-outlets-extended.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OUTLETS = [
  { code: "GENERAL", name: "General (Pusat)" },
  { code: "NUSAFISHING", name: "Nusa Fishing" },
] as const;

const GENERAL_AREA_NAMES = [
  "Maintenance",
  "Logistik Pusat",
  "Admin Pusat",
  "Gudang Pusat",
] as const;

const FISHING_AREA_NAMES = [
  "Produksi Ikan",
  "Cold Storage",
  "Packaging",
  "QC",
  "Gudang Bahan Baku",
  "Sorting",
] as const;

const OUTLET_AREA_NAMES: Record<string, readonly string[]> = {
  GENERAL: GENERAL_AREA_NAMES,
  NUSAFISHING: FISHING_AREA_NAMES,
};

async function main() {
  for (const outlet of OUTLETS) {
    const row = await prisma.outlet.upsert({
      where: { code: outlet.code },
      create: { code: outlet.code, name: outlet.name },
      update: { name: outlet.name, isActive: true },
    });

    const areaNames = OUTLET_AREA_NAMES[outlet.code] ?? [];
    for (const name of areaNames) {
      await prisma.area.upsert({
        where: { outletId_name: { outletId: row.id, name } },
        create: { outletId: row.id, name },
        update: { isActive: true },
      });
    }

    console.log(`✓ ${outlet.code} (${outlet.name}) — ${areaNames.length} area`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

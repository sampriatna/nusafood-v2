import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OUTLETS = [
  { code: "KBU", name: "Kopi Buri Umah" },
  { code: "KISAMEN", name: "Kisamen" },
  { code: "SAMTARO", name: "Samtaro Express" },
] as const;

const AREA_NAMES = [
  "Dapur",
  "Bar",
  "Floor",
  "Gudang",
  "Toilet",
  "Outdoor",
  "Maintenance",
  "Kebon",
  "Kasir",
] as const;

const CATEGORIES = [
  "Cleaning",
  "Maintenance",
  "Stock",
  "Kitchen",
  "Bar",
  "Floor",
  "Waste",
  "General",
] as const;

async function main() {
  for (const outlet of OUTLETS) {
    await prisma.outlet.upsert({
      where: { code: outlet.code },
      create: { code: outlet.code, name: outlet.name },
      update: { name: outlet.name, isActive: true },
    });
  }

  const outlets = await prisma.outlet.findMany();

  for (const outlet of outlets) {
    for (const name of AREA_NAMES) {
      await prisma.area.upsert({
        where: {
          outletId_name: {
            outletId: outlet.id,
            name,
          },
        },
        create: {
          outletId: outlet.id,
          name,
        },
        update: {
          isActive: true,
        },
      });
    }
  }

  for (const name of CATEGORIES) {
    await prisma.category.upsert({
      where: { name },
      create: { name },
      update: { isActive: true },
    });
  }

  console.log(
    `Seed complete: ${outlets.length} outlets, ${AREA_NAMES.length} areas each, ${CATEGORIES.length} categories`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * Seed satu template checklist + items untuk uji Sprint 5.
 * Usage: pnpm seed:checklist
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const outlet = await prisma.outlet.findUnique({ where: { code: "KBU" } });
  if (!outlet) throw new Error("Outlet KBU belum di-seed. Jalankan pnpm db:seed");

  const area = await prisma.area.upsert({
    where: { outletId_name: { outletId: outlet.id, name: "Bar" } },
    create: { outletId: outlet.id, name: "Bar" },
    update: {},
  });

  const templateId = "CHKM-20260717-001";

  await prisma.checklistTemplate.upsert({
    where: { templateId },
    create: {
      templateId,
      templateName: "Closing Bar Harian",
      outletId: outlet.id,
      areaId: area.id,
      checklistTitle: "CLOSING BAR",
      taskTitle: "CLOSING BAR CHECKLIST",
      picName: "Andi Barista",
      picWa: "628123456789",
      requiresPhoto: false,
    },
    update: {
      templateName: "Closing Bar Harian",
      checklistTitle: "CLOSING BAR",
      activeStatus: true,
    },
  });

  await prisma.checklistItem.deleteMany({ where: { templateId } });

  const items = [
    { text: "Buang sampah bar", requiresPhoto: false },
    { text: "Cuci blender & shaker", requiresPhoto: false },
    { text: "Foto etalase bersih", requiresPhoto: true },
  ];

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    await prisma.checklistItem.create({
      data: {
        checklistItemId: `CHKI-20260717-00${i + 1}`,
        templateId,
        itemOrder: i + 1,
        itemText: item.text,
        requiresPhoto: item.requiresPhoto,
        isRequired: true,
        activeStatus: true,
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        template_id: templateId,
        items: items.length,
        next: "POST /api/checklist-reports/generate { template_id }",
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

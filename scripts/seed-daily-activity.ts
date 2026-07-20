/**
 * Seed Daily Activity SOP templates + demo staff links.
 * Usage: pnpm seed:daily-activity
 *
 * Ported from v0-field-task-app PR #19.
 */

import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { DAILY_ACTIVITY_SEED_TEMPLATES } from "./daily-activity-seed-data";

const prisma = new PrismaClient();

const DEMO_STAFF = [
  {
    staffId: "STF-DA-001",
    name: "Budi Santoso",
    position: "Cook",
    outletCode: "KBU",
    areaName: "Dapur",
    wa: "6281234567890",
    token: "a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff00",
    shortCode: "budi",
  },
  {
    staffId: "STF-DA-002",
    name: "Ani Wijaya",
    position: "Barista",
    outletCode: "KISAMEN",
    areaName: "Bar",
    wa: "6281234567891",
    token: "c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff001122",
    shortCode: "ani",
  },
  {
    staffId: "STF-DA-003",
    name: "Rina Putri",
    position: "Server",
    outletCode: "KBU",
    areaName: "Floor",
    wa: "6281234567892",
    token: "b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff0011",
    shortCode: "rina",
  },
  {
    staffId: "STF-DA-004",
    name: "Dedi Pratama",
    position: "PA",
    outletCode: "KBU",
    areaName: "Outdoor",
    wa: "6281234567893",
    token: "d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff00112233",
    shortCode: "dedi",
  },
] as const;

function parseTime(value?: string): Date | null {
  if (!value) return null;
  const [hh, mm] = value.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, hh ?? 0, mm ?? 0, 0));
}

async function main() {
  const outlets = await prisma.outlet.findMany();
  if (!outlets.length) {
    throw new Error("Outlet belum di-seed. Jalankan pnpm db:seed dulu.");
  }
  const outletByCode = new Map(outlets.map((o) => [o.code, o]));

  // Templates
  for (const def of DAILY_ACTIVITY_SEED_TEMPLATES) {
    const outletId = def.outlet_code
      ? outletByCode.get(def.outlet_code)?.id ?? null
      : null;

    const template = await prisma.reportTemplate.upsert({
      where: { code: def.code },
      create: {
        code: def.code,
        title: def.title,
        category: def.category,
        outletId,
        positionGroup: def.position_group,
        standardResult: def.standard_result,
        description: def.standard_result,
        requiresPhoto: def.requires_photo,
        isRequiredDaily: def.is_required_daily,
        kind:
          def.kind ??
          (def.is_required_daily ? "daily_required" : "special_task"),
        targetTimeStart: parseTime(def.target_time_start),
        targetTimeEnd: parseTime(def.target_time_end),
        active: true,
        sortOrder: def.sort_order,
      },
      update: {
        title: def.title,
        category: def.category,
        outletId,
        positionGroup: def.position_group,
        standardResult: def.standard_result,
        description: def.standard_result,
        requiresPhoto: def.requires_photo,
        isRequiredDaily: def.is_required_daily,
        kind:
          def.kind ??
          (def.is_required_daily ? "daily_required" : "special_task"),
        targetTimeStart: parseTime(def.target_time_start),
        targetTimeEnd: parseTime(def.target_time_end),
        active: true,
        sortOrder: def.sort_order,
      },
    });

    await prisma.reportTemplateChecklistItem.deleteMany({
      where: { reportTemplateId: template.id },
    });

    if (def.checklist.length) {
      await prisma.reportTemplateChecklistItem.createMany({
        data: def.checklist.map((text, index) => ({
          reportTemplateId: template.id,
          itemText: text,
          isRequired: true,
          sortOrder: index + 1,
        })),
      });
    }
  }

  // Demo staff + links
  for (const demo of DEMO_STAFF) {
    const outlet = outletByCode.get(demo.outletCode);
    if (!outlet) continue;

    const area = await prisma.area.upsert({
      where: {
        outletId_name: { outletId: outlet.id, name: demo.areaName },
      },
      create: { outletId: outlet.id, name: demo.areaName },
      update: { isActive: true },
    });

    await prisma.staff.upsert({
      where: { staffId: demo.staffId },
      create: {
        staffId: demo.staffId,
        name: demo.name,
        position: demo.position,
        outletId: outlet.id,
        areaId: area.id,
        waNumber: demo.wa,
        role: "STAFF",
        status: "ACTIVE",
      },
      update: {
        name: demo.name,
        position: demo.position,
        outletId: outlet.id,
        areaId: area.id,
        status: "ACTIVE",
      },
    });

    await prisma.staffReportLink.updateMany({
      where: { staffId: demo.staffId, isActive: true },
      data: { isActive: false, revokedAt: new Date() },
    });

    const existingByToken = await prisma.staffReportLink.findUnique({
      where: { token: demo.token },
    });
    const existingByCode = await prisma.staffReportLink.findUnique({
      where: { shortCode: demo.shortCode },
    });

    if (existingByToken) {
      await prisma.staffReportLink.update({
        where: { id: existingByToken.id },
        data: {
          staffId: demo.staffId,
          shortCode: demo.shortCode,
          isActive: true,
          revokedAt: null,
        },
      });
    } else if (existingByCode) {
      await prisma.staffReportLink.update({
        where: { id: existingByCode.id },
        data: {
          staffId: demo.staffId,
          token: demo.token,
          isActive: true,
          revokedAt: null,
        },
      });
    } else {
      await prisma.staffReportLink.create({
        data: {
          staffId: demo.staffId,
          token: demo.token,
          shortCode: demo.shortCode,
          isActive: true,
        },
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        templates: DAILY_ACTIVITY_SEED_TEMPLATES.length,
        demo_links: DEMO_STAFF.map((s) => `/r/${s.shortCode}`),
        note: "Task lama tetap terpisah — ini lapisan Daily Activity SOP.",
        random_hint: randomBytes(2).toString("hex"),
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

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OUTLETS = [
  { code: "GENERAL", name: "General (Pusat)" },
  { code: "KBU", name: "Kopi Buri Umah" },
  { code: "KISAMEN", name: "Kisamen" },
  { code: "SAMTARO", name: "Samtaro Express" },
  { code: "NUSAFISHING", name: "Nusa Fishing" },
] as const;

/** Area FnB — hanya untuk outlet resto/kafe */
const FNB_AREA_NAMES = [
  "Dapur",
  "Bar",
  "Floor",
  "Gudang",
  "Toilet",
  "Outdoor",
  "Kebon",
  "Kasir",
] as const;

/** Outlet pusat — mencakup fungsi lintas bisnis (maintenance, logistik, admin) */
const GENERAL_AREA_NAMES = [
  "Maintenance",
  "Logistik Pusat",
  "Admin Pusat",
  "Gudang Pusat",
] as const;

/** Area khusus Nusa Fishing — terpisah dari FnB */
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
  KBU: FNB_AREA_NAMES,
  KISAMEN: FNB_AREA_NAMES,
  SAMTARO: FNB_AREA_NAMES,
  NUSAFISHING: FISHING_AREA_NAMES,
};

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

async function seedOutletAreas(outlet: { id: string; code: string }) {
  const areaNames = OUTLET_AREA_NAMES[outlet.code] ?? [];
  for (const name of areaNames) {
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
  return areaNames.length;
}

async function main() {
  for (const outlet of OUTLETS) {
    await prisma.outlet.upsert({
      where: { code: outlet.code },
      create: { code: outlet.code, name: outlet.name },
      update: { name: outlet.name, isActive: true },
    });
  }

  const outlets = await prisma.outlet.findMany();
  let areaCount = 0;
  for (const outlet of outlets) {
    areaCount += await seedOutletAreas(outlet);
  }

  for (const name of CATEGORIES) {
    await prisma.category.upsert({
      where: { name },
      create: { name },
      update: { isActive: true },
    });
  }

  const kbu = outlets.find((o) => o.code === "KBU");
  if (kbu) {
    await prisma.staff.upsert({
      where: { staffId: "STF-SEED-LEADER-KBU" },
      create: {
        staffId: "STF-SEED-LEADER-KBU",
        name: "Budi Leader KBU",
        position: "Leader",
        outletId: kbu.id,
        waNumber: "6281234567890",
        role: "LEADER",
        status: "ACTIVE",
        loginEnabled: true,
      },
      update: {
        name: "Budi Leader KBU",
        role: "LEADER",
        status: "ACTIVE",
        loginEnabled: true,
      },
    });

    // Demo login — hanya jika SEED_DEMO_PASSWORDS=true (jangan di production)
    if (process.env.SEED_DEMO_PASSWORDS !== "true") {
      console.log(
        "Skip demo users (set SEED_DEMO_PASSWORDS=true + ADMIN_PASSWORD untuk seed admin/leader)",
      );
    } else {
      // bcrypt hashes for admin123 / leader123 (cost 10) — DEV ONLY
      const adminHash =
        "$2b$10$/NsDP.W.fql71OYoYVZIF.IW.yY4AW1qlbbdZgFOc1Kh1Adtn.NP.";
      const leaderHash =
        "$2b$10$dKoLVjZN/J7BIc5qviG8U./1tIWjWwi9DOrmnwU3RJ6WoAb4HZ4Uq";

      await prisma.userAccount.upsert({
        where: { username: "admin" },
        create: {
          userId: "USR-SEED-ADMIN-001",
          username: "admin",
          passwordHash: adminHash,
          role: "ADMIN",
          loginEnabled: true,
        },
        update: {
          passwordHash: adminHash,
          role: "ADMIN",
          loginEnabled: true,
        },
      });

      await prisma.userAccount.upsert({
        where: { username: "leader.kbu" },
        create: {
          userId: "USR-SEED-LEADER-001",
          staffId: "STF-SEED-LEADER-KBU",
          username: "leader.kbu",
          passwordHash: leaderHash,
          role: "LEADER",
          loginEnabled: true,
        },
        update: {
          staffId: "STF-SEED-LEADER-KBU",
          passwordHash: leaderHash,
          role: "LEADER",
          loginEnabled: true,
        },
      });
    }
  }

  console.log(
    `Seed complete: ${outlets.length} outlets, ${areaCount} areas seeded, ${CATEGORIES.length} categories` +
      (kbu && process.env.SEED_DEMO_PASSWORDS === "true"
        ? ", demo users admin/leader.kbu"
        : ""),
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

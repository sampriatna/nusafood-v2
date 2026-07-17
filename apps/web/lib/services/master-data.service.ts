import { normalizeOutletCode } from "@nusafood/database/normalizers";
import { prisma } from "@/lib/db";

export class MasterDataError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function resolveOutlet(outlet: string) {
  const code = normalizeOutletCode(outlet);
  const row =
    (await prisma.outlet.findUnique({ where: { code } })) ??
    (await prisma.outlet.findFirst({
      where: { name: { equals: outlet, mode: "insensitive" } },
    }));
  if (!row) {
    throw new MasterDataError(
      `Outlet tidak ditemukan: ${outlet}`,
      "OUTLET_NOT_FOUND",
      422,
    );
  }
  return row;
}

export async function listAreas(outlet?: string) {
  const areas = await prisma.area.findMany({
    where: {
      isActive: true,
      ...(outlet
        ? {
            outlet: {
              OR: [
                { code: { equals: outlet, mode: "insensitive" } },
                { name: { equals: outlet, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    include: { outlet: true },
    orderBy: [{ name: "asc" }],
  });

  return areas.map((area) => ({
    id: area.id,
    name: area.name,
    outlet: area.outlet?.code ?? null,
    outlet_name: area.outlet?.name ?? null,
    is_active: area.isActive,
  }));
}

export async function listCategories() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    is_active: category.isActive,
  }));
}

export async function listOutlets() {
  const outlets = await prisma.outlet.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
  });

  return outlets.map((outlet) => ({
    id: outlet.id,
    code: outlet.code,
    name: outlet.name,
    is_active: outlet.isActive,
  }));
}

export async function createArea(outlet: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new MasterDataError("Nama area wajib", "VALIDATION_ERROR");
  }

  const outletRow = await resolveOutlet(outlet);
  const row = await prisma.area.upsert({
    where: { outletId_name: { outletId: outletRow.id, name: trimmed } },
    create: { outletId: outletRow.id, name: trimmed },
    update: { isActive: true },
    include: { outlet: true },
  });

  return {
    id: row.id,
    name: row.name,
    outlet: row.outlet?.code ?? null,
    outlet_name: row.outlet?.name ?? null,
    is_active: row.isActive,
  };
}

export async function deleteArea(outlet: string, name: string) {
  const outletRow = await resolveOutlet(outlet);
  const area = await prisma.area.findUnique({
    where: { outletId_name: { outletId: outletRow.id, name: name.trim() } },
  });
  if (!area) {
    throw new MasterDataError("Area tidak ditemukan", "NOT_FOUND", 404);
  }

  await prisma.area.update({
    where: { id: area.id },
    data: { isActive: false },
  });

  return { name: area.name, outlet: outletRow.code };
}

export async function createCategory(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new MasterDataError("Nama kategori wajib", "VALIDATION_ERROR");
  }

  const row = await prisma.category.upsert({
    where: { name: trimmed },
    create: { name: trimmed },
    update: { isActive: true },
  });

  return {
    id: row.id,
    name: row.name,
    is_active: row.isActive,
  };
}

export async function deleteCategory(name: string) {
  const category = await prisma.category.findUnique({
    where: { name: name.trim() },
  });
  if (!category) {
    throw new MasterDataError("Kategori tidak ditemukan", "NOT_FOUND", 404);
  }

  await prisma.category.update({
    where: { id: category.id },
    data: { isActive: false },
  });

  return { name: category.name };
}

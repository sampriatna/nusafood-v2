import { prisma } from "@/lib/db";

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

  // Deduplicate by name for v1-compatible string list when no outlet filter,
  // but return richer objects for v2 clients.
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

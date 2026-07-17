import type { Staff, StaffStatus } from "@nusafood/types";
import { prisma } from "@/lib/db";
import { mapStaffToApi } from "@/lib/mappers/staff";

export async function listStaff(filters?: {
  outlet?: string;
  status?: string;
}): Promise<Staff[]> {
  const rows = await prisma.staff.findMany({
    where: {
      ...(filters?.status
        ? { status: filters.status.toUpperCase() as StaffStatus }
        : {}),
      ...(filters?.outlet
        ? {
            OR: [
              {
                outlet: {
                  code: { equals: filters.outlet, mode: "insensitive" },
                },
              },
              {
                outlet: {
                  name: { equals: filters.outlet, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    },
    include: { outlet: true, area: true },
    orderBy: [{ name: "asc" }],
  });

  return rows.map(mapStaffToApi);
}

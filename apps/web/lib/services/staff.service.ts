import type {
  CreateStaffPayload,
  Staff,
  StaffRole,
  StaffStatus,
  UpdateStaffPayload,
} from "@nusafood/types";
import { normalizeOutletCode } from "@nusafood/database/normalizers";
import { prisma } from "@/lib/db";
import { generateStaffId } from "@/lib/id";
import { mapStaffToApi } from "@/lib/mappers/staff";

export class StaffWriteError extends Error {
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
    throw new StaffWriteError(
      `Outlet tidak ditemukan: ${outlet}`,
      "OUTLET_NOT_FOUND",
      422,
    );
  }
  return row;
}

async function resolveArea(outletId: string, areaName?: string | null) {
  if (!areaName?.trim()) return null;
  return prisma.area.upsert({
    where: { outletId_name: { outletId, name: areaName.trim() } },
    create: { outletId, name: areaName.trim() },
    update: { isActive: true },
  });
}

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

export async function getStaffById(staffId: string): Promise<Staff | null> {
  const row = await prisma.staff.findUnique({
    where: { staffId },
    include: { outlet: true, area: true },
  });
  return row ? mapStaffToApi(row) : null;
}

export async function createStaff(input: CreateStaffPayload): Promise<Staff> {
  if (!input.name?.trim()) {
    throw new StaffWriteError("Nama staff wajib", "VALIDATION_ERROR");
  }
  if (!input.wa_number?.trim()) {
    throw new StaffWriteError("Nomor WA wajib", "VALIDATION_ERROR");
  }

  const outlet = await resolveOutlet(input.outlet);
  const area = await resolveArea(outlet.id, input.area);

  const row = await prisma.staff.create({
    data: {
      staffId: generateStaffId(),
      name: input.name.trim(),
      position: input.position?.trim() || null,
      outletId: outlet.id,
      areaId: area?.id ?? null,
      waNumber: input.wa_number.trim(),
      role: (input.role || "STAFF") as StaffRole,
      status: "ACTIVE",
      loginEnabled: false,
    },
    include: { outlet: true, area: true },
  });

  return mapStaffToApi(row);
}

export async function updateStaff(
  staffId: string,
  input: UpdateStaffPayload,
): Promise<Staff> {
  const existing = await prisma.staff.findUnique({ where: { staffId } });
  if (!existing) {
    throw new StaffWriteError("Staff tidak ditemukan", "NOT_FOUND", 404);
  }

  const outlet = input.outlet
    ? await resolveOutlet(input.outlet)
    : await prisma.outlet.findUnique({ where: { id: existing.outletId } });
  if (!outlet) {
    throw new StaffWriteError("Outlet tidak ditemukan", "OUTLET_NOT_FOUND", 422);
  }

  const areaName = input.area !== undefined ? input.area : undefined;
  const area =
    areaName !== undefined
      ? await resolveArea(outlet.id, areaName)
      : undefined;

  const row = await prisma.staff.update({
    where: { staffId },
    data: {
      name: input.name?.trim() || undefined,
      position:
        input.position !== undefined
          ? input.position.trim() || null
          : undefined,
      outletId: input.outlet ? outlet.id : undefined,
      areaId:
        areaName !== undefined ? (area?.id ?? null) : undefined,
      waNumber: input.wa_number?.trim() || undefined,
      role: input.role || undefined,
      loginEnabled: input.login_enabled,
    },
    include: { outlet: true, area: true },
  });

  return mapStaffToApi(row);
}

export async function setStaffStatus(
  staffId: string,
  status: StaffStatus,
): Promise<Staff> {
  const existing = await prisma.staff.findUnique({ where: { staffId } });
  if (!existing) {
    throw new StaffWriteError("Staff tidak ditemukan", "NOT_FOUND", 404);
  }

  const row = await prisma.staff.update({
    where: { staffId },
    data: { status },
    include: { outlet: true, area: true },
  });

  return mapStaffToApi(row);
}

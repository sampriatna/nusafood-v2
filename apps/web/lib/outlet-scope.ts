import type { Prisma } from "@nusafood/database";
import type { SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/db";

export class OutletAccessError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = "FORBIDDEN", status = 403) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** ADMIN melihat semua outlet; LEADER terikat session outlet. */
export function isGlobalAdmin(session: SessionPayload): boolean {
  return session.userRole === "ADMIN";
}

export function requireLeaderOutlet(session: SessionPayload): {
  code: string;
  id?: string;
} {
  if (isGlobalAdmin(session)) {
    throw new OutletAccessError("Hanya untuk leader", "FORBIDDEN", 403);
  }
  if (!session.userOutlet) {
    throw new OutletAccessError(
      "Akun leader belum terhubung ke outlet",
      "LEADER_OUTLET_MISSING",
      403,
    );
  }
  return { code: session.userOutlet, id: session.userOutletId };
}

/** Filter list: LEADER selalu outlet sendiri; ADMIN boleh pilih atau semua. */
export function resolveListOutletFilter(
  session: SessionPayload,
  requested?: string | null,
): string | undefined {
  if (isGlobalAdmin(session)) {
    return requested?.trim() || undefined;
  }
  if (session.userRole === "LEADER") {
    return requireLeaderOutlet(session).code;
  }
  return requested?.trim() || undefined;
}

export function buildOutletWhere(outlet: string): Prisma.TaskWhereInput {
  return {
    OR: [
      { outletName: { equals: outlet, mode: "insensitive" } },
      { outlet: { code: { equals: outlet, mode: "insensitive" } } },
      { outlet: { name: { equals: outlet, mode: "insensitive" } } },
    ],
  };
}

export function buildChecklistOutletWhere(
  outlet: string,
): Prisma.ChecklistReportWhereInput {
  return {
    OR: [
      { outlet: { code: { equals: outlet, mode: "insensitive" } } },
      { outlet: { name: { equals: outlet, mode: "insensitive" } } },
    ],
  };
}

export function buildStaffOutletWhere(outlet: string): Prisma.StaffWhereInput {
  return {
    OR: [
      { outlet: { code: { equals: outlet, mode: "insensitive" } } },
      { outlet: { name: { equals: outlet, mode: "insensitive" } } },
    ],
  };
}

export function buildTemplateOutletWhere(
  outlet: string,
): Prisma.ChecklistTemplateWhereInput {
  return {
    outlet: {
      OR: [
        { code: { equals: outlet, mode: "insensitive" } },
        { name: { equals: outlet, mode: "insensitive" } },
      ],
    },
  };
}

export function buildRecurringOutletWhere(
  outlet: string,
): Prisma.RecurringTemplateWhereInput {
  return {
    outlet: {
      OR: [
        { code: { equals: outlet, mode: "insensitive" } },
        { name: { equals: outlet, mode: "insensitive" } },
      ],
    },
  };
}

function matchesOutlet(
  session: SessionPayload,
  resource: {
    outletId?: string | null;
    outletCode?: string | null;
    outletName?: string | null;
  },
): boolean {
  if (isGlobalAdmin(session)) return true;

  if (session.userRole !== "LEADER") return false;

  const leader = requireLeaderOutlet(session);

  if (leader.id && resource.outletId) {
    return leader.id === resource.outletId;
  }

  const code = resource.outletCode?.toLowerCase();
  const name = resource.outletName?.toLowerCase();
  const leaderCode = leader.code.toLowerCase();

  return code === leaderCode || name === leaderCode;
}

export function assertOutletAccess(
  session: SessionPayload,
  resource: {
    outletId?: string | null;
    outletCode?: string | null;
    outletName?: string | null;
  },
): void {
  if (matchesOutlet(session, resource)) return;
  throw new OutletAccessError(
    "Akses outlet ditolak",
    "OUTLET_FORBIDDEN",
    403,
  );
}

export async function assertTaskOutletAccess(
  session: SessionPayload,
  taskId: string,
): Promise<void> {
  if (isGlobalAdmin(session)) return;

  const task = await prisma.task.findUnique({
    where: { taskId },
    include: { outlet: true },
  });
  if (!task) {
    throw new OutletAccessError("Tugas tidak ditemukan", "NOT_FOUND", 404);
  }

  assertOutletAccess(session, {
    outletId: task.outletId,
    outletCode: task.outlet?.code,
    outletName: task.outletName ?? task.outlet?.name,
  });
}

export async function assertStaffOutletAccess(
  session: SessionPayload,
  staffId: string,
): Promise<void> {
  if (isGlobalAdmin(session)) return;

  const staff = await prisma.staff.findUnique({
    where: { staffId },
    include: { outlet: true },
  });
  if (!staff) {
    throw new OutletAccessError("Staff tidak ditemukan", "NOT_FOUND", 404);
  }

  assertOutletAccess(session, {
    outletId: staff.outletId,
    outletCode: staff.outlet.code,
    outletName: staff.outlet.name,
  });
}

export async function assertChecklistTemplateOutletAccess(
  session: SessionPayload,
  templateId: string,
): Promise<void> {
  if (isGlobalAdmin(session)) return;

  const template = await prisma.checklistTemplate.findUnique({
    where: { templateId },
    include: { outlet: true },
  });
  if (!template) {
    throw new OutletAccessError("Template tidak ditemukan", "NOT_FOUND", 404);
  }

  assertOutletAccess(session, {
    outletId: template.outletId,
    outletCode: template.outlet.code,
    outletName: template.outlet.name,
  });
}

export async function assertRecurringTemplateOutletAccess(
  session: SessionPayload,
  templateId: string,
): Promise<void> {
  if (isGlobalAdmin(session)) return;

  const template = await prisma.recurringTemplate.findUnique({
    where: { templateId },
    include: { outlet: true },
  });
  if (!template) {
    throw new OutletAccessError("Template tidak ditemukan", "NOT_FOUND", 404);
  }

  assertOutletAccess(session, {
    outletId: template.outletId,
    outletCode: template.outlet.code,
    outletName: template.outlet.name,
  });
}

export async function assertChecklistReportOutletAccess(
  session: SessionPayload,
  taskId: string,
): Promise<void> {
  if (isGlobalAdmin(session)) return;

  const report = await prisma.checklistReport.findFirst({
    where: { taskId },
    include: { outlet: true },
  });
  if (!report) {
    throw new OutletAccessError("Checklist tidak ditemukan", "NOT_FOUND", 404);
  }

  assertOutletAccess(session, {
    outletId: report.outletId,
    outletCode: report.outlet?.code,
    outletName: report.outlet?.name,
  });
}

/** LEADER hanya boleh membuat/mengubah data untuk outlet sendiri. */
export function assertCreateOutletAllowed(
  session: SessionPayload,
  outletCode: string,
): void {
  if (isGlobalAdmin(session)) return;
  if (session.userRole !== "LEADER") return;

  const leader = requireLeaderOutlet(session);
  if (outletCode.toLowerCase() !== leader.code.toLowerCase()) {
    throw new OutletAccessError(
      "Leader hanya boleh membuat data untuk outlet sendiri",
      "OUTLET_FORBIDDEN",
      403,
    );
  }
}

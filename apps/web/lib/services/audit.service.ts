import { prisma } from "@/lib/db";

export type AuditLogFilters = {
  limit?: number;
  entityType?: string;
  action?: string;
  actorId?: string;
  outletCode?: string;
};

export type AuditLogRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_type: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  outlet_id: string | null;
  outlet_code: string | null;
  note: string | null;
  old_value: unknown;
  new_value: unknown;
  created_at: string;
};

function metaString(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const value = (metadata as Record<string, unknown>)[key];
  return value == null || value === "" ? null : String(value);
}

export async function listAuditLogs(
  filters: AuditLogFilters = {},
): Promise<AuditLogRow[]> {
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 300);
  const where: Record<string, unknown> = {};

  if (filters.entityType?.trim()) {
    where.entityType = {
      equals: filters.entityType.trim(),
      mode: "insensitive",
    };
  }
  if (filters.action?.trim()) {
    where.action = { contains: filters.action.trim(), mode: "insensitive" };
  }
  if (filters.actorId?.trim()) {
    where.actorId = filters.actorId.trim();
  }

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const mapped = rows.map((row) => ({
    id: row.id,
    entity_type: row.entityType,
    entity_id: row.entityId,
    action: row.action,
    actor_type: row.actorType,
    actor_id: row.actorId,
    actor_name: row.actorName,
    actor_role: metaString(row.metadata, "actor_role"),
    outlet_id: metaString(row.metadata, "outlet_id"),
    outlet_code: metaString(row.metadata, "outlet_code"),
    note: metaString(row.metadata, "note"),
    old_value: row.oldValue,
    new_value: row.newValue,
    created_at: row.createdAt.toISOString(),
  }));

  if (filters.outletCode?.trim()) {
    const code = filters.outletCode.trim().toLowerCase();
    return mapped.filter(
      (row) => row.outlet_code?.toLowerCase() === code,
    );
  }

  return mapped;
}

import type { SessionPayload } from "@/lib/auth";
import { getAppRole } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/services/dual-write.service";

/** Audit log RBAC-aware untuk aksi sensitif. */
export async function writeRbacAuditLog(input: {
  session: SessionPayload | null | undefined;
  action: string;
  entityType: string;
  entityId: string;
  outletId?: string | null;
  note?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  const role = getAppRole(input.session);
  try {
    await writeAuditLog({
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      actorType: role.toLowerCase(),
      actorId: input.session?.userId,
      actorName: input.session?.userName,
      oldValue: input.oldValue,
      newValue: input.newValue,
      metadata: {
        actor_role: role,
        outlet_id: input.outletId ?? input.session?.userOutletId ?? null,
        outlet_code: input.session?.userOutlet ?? null,
        note: input.note ?? null,
      },
    });
  } catch (error) {
    console.error("[rbac-audit]", error);
  }
}

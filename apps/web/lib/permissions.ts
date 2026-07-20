import type { StaffRole } from "@nusafood/types";
import type { SessionPayload } from "@/lib/auth";
import { resolveIsOwner } from "@/lib/owner";

export { resolveIsOwner } from "@/lib/owner";

/** Effective app role — OWNER is session-level, not a DB enum (safe approach). */
export type AppRole = "OWNER" | "ADMIN" | "LEADER" | "STAFF" | "PUBLIC";

export type DisciplinaryAction =
  | "create_draft_st"
  | "create_draft_sp"
  | "submit_approval_sp"
  | "approve_sp"
  | "generate_pdf_sp"
  | "generate_pdf_st"
  | "send_letter"
  | "cancel_letter"
  | "resolve_letter"
  | "acknowledge_letter";

export function isOwner(
  session: SessionPayload | null | undefined,
): boolean {
  if (!session) return false;
  if (session.isOwner === true) return true;
  return resolveIsOwner({
    userId: session.userId,
    username: session.username,
  });
}

export function isAdminRole(
  session: SessionPayload | null | undefined,
): boolean {
  return session?.userRole === "ADMIN";
}

export function isLeader(
  session: SessionPayload | null | undefined,
): boolean {
  return session?.userRole === "LEADER";
}

export function isStaff(
  session: SessionPayload | null | undefined,
): boolean {
  return session?.userRole === "STAFF";
}

/** Dashboard/admin surface: OWNER, ADMIN, LEADER (bukan STAFF/public). */
export function canAccessAdminDashboard(
  session: SessionPayload | null | undefined,
): boolean {
  if (!session) return false;
  if (isOwner(session)) return true;
  return session.userRole === "ADMIN" || session.userRole === "LEADER";
}

/** Akses lintas outlet (OWNER + ADMIN). */
export function hasGlobalOutletScope(
  session: SessionPayload | null | undefined,
): boolean {
  if (!session) return false;
  return isOwner(session) || isAdminRole(session);
}

export function getAppRole(
  session: SessionPayload | null | undefined,
): AppRole {
  if (!session) return "PUBLIC";
  if (isOwner(session)) return "OWNER";
  if (session.userRole === "ADMIN") return "ADMIN";
  if (session.userRole === "LEADER") return "LEADER";
  if (session.userRole === "STAFF") return "STAFF";
  return "PUBLIC";
}

/**
 * Fallback env untuk ADMIN tanpa flag DB.
 * Default false = Owner-only (lebih aman). Set ADMIN_CAN_APPROVE_SP=true untuk semua ADMIN.
 */
export function adminCanApproveSpEnvFallback(): boolean {
  return process.env.ADMIN_CAN_APPROVE_SP === "true";
}

export function adminCanGeneratePdfSpEnvFallback(): boolean {
  if (process.env.ADMIN_CAN_GENERATE_PDF_SP === "true") return true;
  if (process.env.ADMIN_CAN_GENERATE_PDF_SP === "false") return false;
  return adminCanApproveSpEnvFallback();
}

export function leaderCanSendSt(): boolean {
  return process.env.LEADER_CAN_SEND_ST !== "false";
}

export function canApproveSP(
  session: SessionPayload | null | undefined,
): boolean {
  if (!session) return false;
  if (isOwner(session)) return true;
  if (!isAdminRole(session)) return false;
  // Permission eksplisit dari DB (session claim)
  if (session.canApproveSp === true) return true;
  // Fallback env global (opsional)
  return adminCanApproveSpEnvFallback();
}

export function canGeneratePdfSP(
  session: SessionPayload | null | undefined,
): boolean {
  if (!session) return false;
  if (isOwner(session)) return true;
  if (!isAdminRole(session)) return false;
  if (session.canApproveSp === true) return true;
  return adminCanGeneratePdfSpEnvFallback();
}

export function canCancelLetter(
  session: SessionPayload | null | undefined,
): boolean {
  if (!session) return false;
  return isOwner(session) || isAdminRole(session);
}

export function canManageUsers(
  session: SessionPayload | null | undefined,
): boolean {
  if (!session) return false;
  return isOwner(session) || isAdminRole(session);
}

/** Settings sistem sensitif (user, sync, master write) — OWNER/ADMIN. */
export function canManageSystemSettings(
  session: SessionPayload | null | undefined,
): boolean {
  if (!session) return false;
  return isOwner(session) || isAdminRole(session);
}

/** Master data write (areas/categories/staff mutate). */
export function canManageMasterData(
  session: SessionPayload | null | undefined,
): boolean {
  return canManageSystemSettings(session);
}

export function canViewAuditLog(
  session: SessionPayload | null | undefined,
): boolean {
  if (!session) return false;
  return isOwner(session) || isAdminRole(session) || isLeader(session);
}

export function canExportGlobal(
  session: SessionPayload | null | undefined,
): boolean {
  if (!session) return false;
  return isOwner(session) || isAdminRole(session);
}

export function canCreateTask(
  session: SessionPayload | null | undefined,
  _outletId?: string | null,
): boolean {
  if (!session) return false;
  if (isOwner(session) || isAdminRole(session) || isLeader(session)) {
    return true;
  }
  return false;
}

export function canViewOutlet(
  session: SessionPayload | null | undefined,
  outlet: {
    outletId?: string | null;
    outletCode?: string | null;
    outletName?: string | null;
  },
): boolean {
  if (!session) return false;
  if (hasGlobalOutletScope(session)) return true;
  if (!isLeader(session)) return false;

  const leaderCode = session.userOutlet?.toLowerCase();
  const leaderId = session.userOutletId;
  if (!leaderCode && !leaderId) return false;

  if (leaderId && outlet.outletId && leaderId === outlet.outletId) return true;

  const code = outlet.outletCode?.toLowerCase();
  const name = outlet.outletName?.toLowerCase();
  if (leaderCode && (code === leaderCode || name === leaderCode)) return true;
  return false;
}

export function canAccessDisciplinaryAction(
  session: SessionPayload | null | undefined,
  action: DisciplinaryAction,
  letter?: {
    type?: "TEGURAN" | "PERINGATAN" | string;
    status?: string;
    outletId?: string | null;
    outletCode?: string | null;
    outletName?: string | null;
  },
): boolean {
  if (!session || !canAccessAdminDashboard(session)) return false;

  const type = letter?.type;
  const isSp = type === "PERINGATAN";
  const isSt = type === "TEGURAN";

  switch (action) {
    case "create_draft_st":
    case "create_draft_sp":
    case "submit_approval_sp":
      return (
        isOwner(session) ||
        isAdminRole(session) ||
        isLeader(session)
      );
    case "approve_sp":
      return canApproveSP(session);
    case "generate_pdf_sp":
      return canGeneratePdfSP(session);
    case "generate_pdf_st":
      return isOwner(session) || isAdminRole(session) || isLeader(session);
    case "send_letter":
      if (isOwner(session) || isAdminRole(session)) return true;
      if (isLeader(session) && isSt && leaderCanSendSt()) return true;
      if (isLeader(session) && isSp) return false;
      return false;
    case "cancel_letter":
      return canCancelLetter(session);
    case "resolve_letter":
      if (isOwner(session) || isAdminRole(session)) return true;
      if (isLeader(session) && (isSt || !type)) return true;
      return false;
    case "acknowledge_letter":
      // Portal staff belum ada — admin/owner/leader boleh tandai operasional.
      return isOwner(session) || isAdminRole(session) || isLeader(session);
    default:
      return false;
  }
}

export interface SessionCapabilities {
  app_role: AppRole;
  is_owner: boolean;
  can_access_dashboard: boolean;
  can_approve_sp: boolean;
  can_generate_pdf_sp: boolean;
  can_cancel_letter: boolean;
  can_manage_users: boolean;
  can_manage_system_settings: boolean;
  can_manage_master_data: boolean;
  can_export_global: boolean;
  can_view_audit_log: boolean;
  global_outlet_scope: boolean;
  outlet: string | null;
}

export function getSessionCapabilities(
  session: SessionPayload | null | undefined,
): SessionCapabilities {
  return {
    app_role: getAppRole(session),
    is_owner: isOwner(session),
    can_access_dashboard: canAccessAdminDashboard(session),
    can_approve_sp: canApproveSP(session),
    can_generate_pdf_sp: canGeneratePdfSP(session),
    can_cancel_letter: canCancelLetter(session),
    can_manage_users: canManageUsers(session),
    can_manage_system_settings: canManageSystemSettings(session),
    can_manage_master_data: canManageMasterData(session),
    can_export_global: canExportGlobal(session),
    can_view_audit_log: canViewAuditLog(session),
    global_outlet_scope: hasGlobalOutletScope(session),
    outlet: session?.userOutlet ?? null,
  };
}

export function dashboardRoles(): StaffRole[] {
  return ["ADMIN", "LEADER"];
}

export function ownerOrAdminDeniedMessage(): string {
  return "Akses ditolak. Fitur ini hanya untuk Owner/Admin.";
}

export function outletDeniedMessage(): string {
  return "Akses ditolak. Data ini bukan outlet kamu.";
}

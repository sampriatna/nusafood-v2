import { describe, expect, it, beforeEach, afterEach } from "vitest";
import type { SessionPayload } from "@/lib/auth";
import {
  canAccessAdminDashboard,
  canAccessDisciplinaryAction,
  canAcknowledgeOwnLetter,
  canApproveSP,
  canCancelLetter,
  canGeneratePdfSP,
  canManageUsers,
  getAppRole,
  getSessionCapabilities,
  hasGlobalOutletScope,
} from "@/lib/permissions";
import { resolveIsOwner } from "@/lib/owner";

function session(
  partial: Partial<SessionPayload> &
    Pick<SessionPayload, "userId" | "userRole">,
): SessionPayload {
  return {
    isAdmin: true,
    isOwner: false,
    canApproveSp: false,
    loginAt: Date.now(),
    expiresAt: Date.now() + 3600_000,
    userName: "Test",
    ...partial,
  };
}

const prevApprove = process.env.ADMIN_CAN_APPROVE_SP;

describe("permissions RBAC", () => {
  beforeEach(() => {
    delete process.env.ADMIN_CAN_APPROVE_SP;
  });

  afterEach(() => {
    if (prevApprove === undefined) delete process.env.ADMIN_CAN_APPROVE_SP;
    else process.env.ADMIN_CAN_APPROVE_SP = prevApprove;
  });

  it("owner is distinct app role from admin", () => {
    const owner = session({
      userId: "env-admin",
      userRole: "ADMIN",
      isOwner: true,
      canApproveSp: true,
    });
    const admin = session({ userId: "usr-admin", userRole: "ADMIN" });
    expect(getAppRole(owner)).toBe("OWNER");
    expect(getAppRole(admin)).toBe("ADMIN");
    expect(hasGlobalOutletScope(owner)).toBe(true);
    expect(hasGlobalOutletScope(admin)).toBe(true);
  });

  it("staff cannot access admin dashboard", () => {
    const staff = session({
      userId: "usr-staff",
      userRole: "STAFF",
      isAdmin: false,
    });
    expect(canAccessAdminDashboard(staff)).toBe(false);
    expect(canManageUsers(staff)).toBe(false);
  });

  it("leader cannot approve SP or cancel letter", () => {
    const leader = session({
      userId: "usr-leader",
      userRole: "LEADER",
      userOutlet: "KBU",
    });
    expect(canApproveSP(leader)).toBe(false);
    expect(canGeneratePdfSP(leader)).toBe(false);
    expect(canCancelLetter(leader)).toBe(false);
    expect(
      canAccessDisciplinaryAction(leader, "approve_sp", { type: "PERINGATAN" }),
    ).toBe(false);
    expect(
      canAccessDisciplinaryAction(leader, "create_draft_sp", {
        type: "PERINGATAN",
      }),
    ).toBe(true);
    expect(
      canAccessDisciplinaryAction(leader, "send_letter", { type: "PERINGATAN" }),
    ).toBe(false);
    expect(
      canAccessDisciplinaryAction(leader, "send_letter", { type: "TEGURAN" }),
    ).toBe(true);
  });

  it("admin without canApproveSp cannot approve (default owner-only)", () => {
    const admin = session({ userId: "usr-admin", userRole: "ADMIN" });
    expect(canApproveSP(admin)).toBe(false);
  });

  it("admin with DB canApproveSp can approve", () => {
    const admin = session({
      userId: "usr-admin",
      userRole: "ADMIN",
      canApproveSp: true,
    });
    expect(canApproveSP(admin)).toBe(true);
    expect(canGeneratePdfSP(admin)).toBe(true);
  });

  it("ADMIN_CAN_APPROVE_SP=true allows all admins as fallback", () => {
    process.env.ADMIN_CAN_APPROVE_SP = "true";
    const admin = session({ userId: "usr-admin", userRole: "ADMIN" });
    expect(canApproveSP(admin)).toBe(true);
  });

  it("owner can approve SP even without admin flag", () => {
    const owner = session({
      userId: "env-admin",
      userRole: "ADMIN",
      isOwner: true,
      canApproveSp: true,
    });
    expect(canApproveSP(owner)).toBe(true);
  });

  it("resolveIsOwner reads DB flag", () => {
    expect(
      resolveIsOwner({
        userId: "usr-1",
        username: "bos",
        isOwnerDb: true,
      }),
    ).toBe(true);
    expect(
      resolveIsOwner({
        userId: "usr-1",
        username: "bos",
        isOwnerDb: false,
      }),
    ).toBe(false);
  });

  it("capabilities payload exposes matrix flags", () => {
    const caps = getSessionCapabilities(
      session({
        userId: "env-admin",
        userRole: "ADMIN",
        isOwner: true,
        canApproveSp: true,
      }),
    );
    expect(caps.app_role).toBe("OWNER");
    expect(caps.can_approve_sp).toBe(true);
    expect(caps.can_manage_users).toBe(true);
    expect(caps.global_outlet_scope).toBe(true);
  });

  it("staff can acknowledge own SENT letter only", () => {
    const staff = session({
      userId: "usr-staff",
      userRole: "STAFF",
      isAdmin: false,
      staffId: "STF-001",
    });
    expect(
      canAcknowledgeOwnLetter(staff, {
        employeeId: "STF-001",
        status: "SENT",
      }),
    ).toBe(true);
    expect(
      canAcknowledgeOwnLetter(staff, {
        employeeId: "STF-OTHER",
        status: "SENT",
      }),
    ).toBe(false);
    expect(
      canAccessDisciplinaryAction(staff, "acknowledge_letter"),
    ).toBe(true);
    expect(canAccessDisciplinaryAction(staff, "approve_sp")).toBe(false);
  });
});

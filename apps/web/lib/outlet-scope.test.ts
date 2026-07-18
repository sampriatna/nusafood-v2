import { describe, expect, it } from "vitest";
import type { SessionPayload } from "@/lib/auth";
import {
  OutletAccessError,
  assertCreateOutletAllowed,
  assertOutletAccess,
  isGlobalAdmin,
  resolveListOutletFilter,
} from "@/lib/outlet-scope";

const adminSession: SessionPayload = {
  isAdmin: true,
  loginAt: Date.now(),
  expiresAt: Date.now() + 3600_000,
  userId: "admin",
  userName: "Admin",
  userRole: "ADMIN",
};

const leaderKbu: SessionPayload = {
  isAdmin: true,
  loginAt: Date.now(),
  expiresAt: Date.now() + 3600_000,
  userId: "leader-1",
  userName: "Leader KBU",
  userRole: "LEADER",
  userOutlet: "KBU",
  userOutletId: "outlet-kbu-uuid",
  staffId: "STF-001",
};

describe("outlet-scope", () => {
  it("admin is global", () => {
    expect(isGlobalAdmin(adminSession)).toBe(true);
    expect(resolveListOutletFilter(adminSession, "Kisamen")).toBe("Kisamen");
    expect(resolveListOutletFilter(adminSession, null)).toBeUndefined();
  });

  it("leader is forced to own outlet on list filter", () => {
    expect(resolveListOutletFilter(leaderKbu, "Kisamen")).toBe("KBU");
    expect(resolveListOutletFilter(leaderKbu, null)).toBe("KBU");
  });

  it("leader cannot create for other outlet", () => {
    expect(() =>
      assertCreateOutletAllowed(leaderKbu, "Kisamen"),
    ).toThrow(OutletAccessError);
    expect(() => assertCreateOutletAllowed(leaderKbu, "KBU")).not.toThrow();
  });

  it("leader blocked from foreign outlet resource", () => {
    expect(() =>
      assertOutletAccess(leaderKbu, {
        outletId: "other-outlet-id",
        outletCode: "Kisamen",
      }),
    ).toThrow(OutletAccessError);
  });

  it("leader allowed for matching outlet id", () => {
    expect(() =>
      assertOutletAccess(leaderKbu, {
        outletId: "outlet-kbu-uuid",
        outletCode: "KBU",
      }),
    ).not.toThrow();
  });

  it("admin bypasses outlet match", () => {
    expect(() =>
      assertOutletAccess(adminSession, {
        outletId: "any",
        outletCode: "Kisamen",
      }),
    ).not.toThrow();
  });
});

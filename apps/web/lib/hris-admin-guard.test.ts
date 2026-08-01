import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SessionPayload } from "@/lib/auth";
import { isHrisAdmin, requireHrisAdminSession } from "@/lib/hris-admin-guard";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

describe("hris-admin-guard", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("AUTH_REQUIRED", "true");
  });

  const adminSession: SessionPayload = {
    isAdmin: true,
    loginAt: Date.now(),
    expiresAt: Date.now() + 3600_000,
    userId: "admin-1",
    userName: "Admin",
    userRole: "ADMIN",
  };

  const leaderSession: SessionPayload = {
    ...adminSession,
    userId: "leader-1",
    userRole: "LEADER",
  };

  it("allows ADMIN", () => {
    expect(isHrisAdmin(adminSession)).toBe(true);
  });

  it("blocks LEADER from HRIS admin pages", () => {
    expect(isHrisAdmin(leaderSession)).toBe(false);
    expect(() => requireHrisAdminSession(leaderSession)).toThrow(
      "REDIRECT:/dashboard",
    );
  });

  it("blocks unauthenticated session", () => {
    expect(isHrisAdmin(null)).toBe(false);
    expect(() => requireHrisAdminSession(null)).toThrow("REDIRECT:/dashboard");
  });
});

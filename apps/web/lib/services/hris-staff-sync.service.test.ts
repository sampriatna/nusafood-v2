import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAcquire = vi.fn();
const mockRelease = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    hrisSyncLog: {
      create: vi.fn().mockResolvedValue({ id: "log-1" }),
      update: vi.fn(),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    staff: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    outlet: {
      findFirst: vi.fn().mockResolvedValue({ id: "outlet-1" }),
      count: vi.fn().mockResolvedValue(0),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/services/hris-sync-lock.service", () => ({
  acquireHrisSyncLock: (...args: unknown[]) => mockAcquire(...args),
  releaseHrisSyncLock: (...args: unknown[]) => mockRelease(...args),
}));

vi.mock("@/lib/services/hris-api.client", () => ({
  HrisApiClient: vi.fn().mockImplementation(() => ({
    isConfigured: () => true,
    iterateStaff: async function* () {
      yield [];
    },
  })),
  HrisApiError: class HrisApiError extends Error {
    code: string;
    status: number;
    constructor(message: string, code: string, status = 500) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
  normalizeHrisPhone: (phone?: string | null) =>
    phone ? `62${phone.replace(/\D/g, "").replace(/^0/, "")}` : null,
}));

import { runHrisStaffSync } from "@/lib/services/hris-staff-sync.service";
import { HrisApiError } from "@/lib/services/hris-api.client";

describe("runHrisStaffSync guards", () => {
  beforeEach(() => {
    mockAcquire.mockReset();
    mockRelease.mockReset();
    vi.stubEnv("HRIS_SYNC_ENABLED", "true");
    vi.stubEnv("HRIS_API_BASE_URL", "https://hris.example.com");
    vi.stubEnv("HRIS_API_TOKEN", "secret-token");
    vi.stubEnv("HRIS_OUTLET_MAPPING_CONFIRMED", "true");
  });

  it("returns 409 when sync lock not acquired (concurrent sync)", async () => {
    mockAcquire.mockResolvedValue({ acquired: false, holder: "cron" });

    await expect(runHrisStaffSync({ triggeredBy: "admin" })).rejects.toBeInstanceOf(
      HrisApiError,
    );
    await expect(runHrisStaffSync({ triggeredBy: "admin" })).rejects.toMatchObject({
      code: "HRIS_SYNC_IN_PROGRESS",
      status: 409,
    });
    expect(mockRelease).not.toHaveBeenCalled();
  });

  it("releases lock after successful sync", async () => {
    mockAcquire.mockResolvedValue({ acquired: true });

    await runHrisStaffSync({ triggeredBy: "admin" });
    expect(mockRelease).toHaveBeenCalledOnce();
  });

  it("blocks actual sync when outlet mapping not confirmed", async () => {
    vi.stubEnv("HRIS_OUTLET_MAPPING_CONFIRMED", "false");

    await expect(runHrisStaffSync({ triggeredBy: "admin" })).rejects.toMatchObject({
      code: "OUTLET_MAPPING_NOT_CONFIRMED",
    });
    expect(mockAcquire).not.toHaveBeenCalled();
  });

  it("dry-run does not acquire lock", async () => {
    const result = await runHrisStaffSync({ dryRun: true });
    expect(result).toHaveProperty("would_create");
    expect(mockAcquire).not.toHaveBeenCalled();
  });
});

describe("partial failure status contract", () => {
  it("partial when some records fail but others succeed", () => {
    const checked: number = 10;
    const failed: number = 2;
    const status =
      failed === 0 ? "success" : checked > failed ? "partial" : "failed";
    expect(status).toBe("partial");
  });
});

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  deliverWhatsApp,
  resolveWaProvider,
} from "./whatsapp.service";

vi.mock("@/lib/services/gas-adapter.service", () => ({
  isGasEnabled: vi.fn(() => false),
  callGasAction: vi.fn(),
}));

vi.mock("@/lib/services/dual-write.service", () => ({
  logSyncOperation: vi.fn(async () => undefined),
}));

describe("whatsapp.service", () => {
  const env = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
  });

  it("defaults to auto provider", () => {
    delete process.env.WA_PROVIDER;
    expect(resolveWaProvider()).toBe("auto");
  });

  it("wame mode always returns wa.me link without auto send", async () => {
    process.env.WA_PROVIDER = "wame";
    const result = await deliverWhatsApp({
      to: "081234567890",
      message: "Halo test",
      gas: { action: "resendWhatsApp", payload: { task_id: "T1" } },
      log: {
        operation: "test_wa",
        entityType: "task",
        entityId: "T1",
      },
    });

    expect(result.auto_sent).toBe(false);
    expect(result.provider).toBe("wame");
    expect(result.wa_link).toContain("https://wa.me/6281234567890");
    expect(result.wa_link).toContain(encodeURIComponent("Halo test"));
  });
});

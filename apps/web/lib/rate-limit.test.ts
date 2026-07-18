import { describe, expect, it } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";
import { matchesRepeatSchedule } from "@/lib/services/recurring-generate.service";

describe("rate-limit", () => {
  it("allows requests under limit", () => {
    const key = `test-${Date.now()}`;
    expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true);
  });

  it("blocks after limit exceeded", () => {
    const key = `block-${Date.now()}`;
    checkRateLimit(key, 2, 60_000);
    checkRateLimit(key, 2, 60_000);
    const third = checkRateLimit(key, 2, 60_000);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSec).toBeGreaterThan(0);
  });
});

describe("recurring schedule", () => {
  const repeatTime = new Date(Date.UTC(1970, 0, 1, 8, 0, 0));

  it("matches daily after repeat time", () => {
    const now = new Date("2026-07-18T10:00:00+07:00");
    expect(
      matchesRepeatSchedule("daily", [], repeatTime, now),
    ).toBe(true);
  });

  it("matches custom repeat day in Indonesian", () => {
    const saturday = new Date("2026-07-18T10:00:00+07:00");
    expect(
      matchesRepeatSchedule("custom", ["sabtu"], repeatTime, saturday),
    ).toBe(true);
    expect(
      matchesRepeatSchedule("custom", ["senin"], repeatTime, saturday),
    ).toBe(false);
  });
});

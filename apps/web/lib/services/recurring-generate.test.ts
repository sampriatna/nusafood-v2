import { describe, expect, it } from "vitest";
import {
  isScheduledOnDate,
  matchesMonthly,
  parseMonthlyDates,
} from "./recurring-generate.service";

const createdAt = new Date("2026-01-20T09:00:00+07:00");
const repeatTime = new Date(Date.UTC(1970, 0, 1, 14, 0, 0)); // 14:00

describe("parseMonthlyDates", () => {
  it("keeps valid unique dates, sorted", () => {
    expect(parseMonthlyDates(["15", "1", "15", "senin", "40", "0"])).toEqual([1, 15]);
  });
});

describe("matchesMonthly", () => {
  it("matches every selected date (2x sebulan)", () => {
    const days = ["1", "15"];
    expect(matchesMonthly(days, createdAt, new Date("2026-10-01T06:00:00+07:00"))).toBe(true);
    expect(matchesMonthly(days, createdAt, new Date("2026-10-15T06:00:00+07:00"))).toBe(true);
    expect(matchesMonthly(days, createdAt, new Date("2026-10-16T06:00:00+07:00"))).toBe(false);
  });

  it("clamps 31 to the last day of shorter months", () => {
    expect(matchesMonthly(["31"], createdAt, new Date("2026-02-28T08:00:00+07:00"))).toBe(true);
    expect(matchesMonthly(["31"], createdAt, new Date("2026-04-30T08:00:00+07:00"))).toBe(true);
    expect(matchesMonthly(["31"], createdAt, new Date("2026-05-30T08:00:00+07:00"))).toBe(false);
  });

  it("falls back to template creation day for old templates", () => {
    expect(matchesMonthly([], createdAt, new Date("2026-10-20T08:00:00+07:00"))).toBe(true);
    expect(matchesMonthly([], createdAt, new Date("2026-10-21T08:00:00+07:00"))).toBe(false);
  });
});

describe("isScheduledOnDate", () => {
  it("schedules a 14:00 daily template at the 08:00 cron (time ignored)", () => {
    const morning = new Date("2026-10-01T08:00:00+07:00");
    expect(
      isScheduledOnDate(
        { repeatType: "daily", repeatDays: [], repeatTime, createdAt },
        morning,
      ),
    ).toBe(true);
  });

  it("uses WIB date near midnight UTC", () => {
    // 2026-10-15 00:30 WIB = 2026-10-14 17:30 UTC
    const now = new Date("2026-10-14T17:30:00Z");
    expect(
      isScheduledOnDate(
        { repeatType: "monthly", repeatDays: ["15"], repeatTime, createdAt },
        now,
      ),
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { buildDutyRows, weekDates } from "./weekly-roster.service";

const qualified = new Map([
  ["S1", new Set(["Kasir", "Waiters"])],
  ["S2", new Set(["Kasir"])],
]);

describe("weekDates", () => {
  it("returns Monday–Sunday of the week (WIB)", () => {
    expect(weekDates("2026-09-30")).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
  });
});

describe("buildDutyRows", () => {
  it("groups positions per staff per day", () => {
    const rows = buildDutyRows(
      ["2026-09-28", "2026-09-29"],
      {
        "2026-09-28": { Kasir: "S1", Waiters: "S1" },
        "2026-09-29": { Kasir: "S2" },
      },
      qualified,
    );
    expect([...rows.get("2026-09-28")!]).toEqual([["S1", ["Kasir", "Waiters"]]]);
    expect([...rows.get("2026-09-29")!]).toEqual([["S2", ["Kasir"]]]);
  });

  it("rejects staff without the job", () => {
    expect(() =>
      buildDutyRows(["2026-09-28"], { "2026-09-28": { Waiters: "S2" } }, qualified),
    ).toThrow(/tidak punya jabatan/);
  });
});

import { describe, expect, it } from "vitest";
import {
  DAILY_ACTIVITY_SEED_TEMPLATES,
  listPositionDailyTemplateCounts,
} from "./daily-activity-seed";

describe("daily-activity-seed", () => {
  it("has unique template codes", () => {
    const codes = DAILY_ACTIVITY_SEED_TEMPLATES.map((row) => row.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("includes five new position groups with expected activity counts", () => {
    const expected: Record<string, number> = {
      SupirPA: 7,
      MaintenanceKebon: 8,
      LeaderOutlet: 8,
      MarketingFnB: 7,
      MarketingNF: 7,
    };

    for (const [position, count] of Object.entries(expected)) {
      const rows = DAILY_ACTIVITY_SEED_TEMPLATES.filter(
        (row) => row.position_group === position,
      );
      expect(rows).toHaveLength(count);
      for (const row of rows) {
        expect(row.checklist.length).toBeGreaterThan(0);
      }
    }
  });

  it("includes one global kendala activity without position group", () => {
    const global = DAILY_ACTIVITY_SEED_TEMPLATES.filter(
      (row) => !row.position_group && row.title === "Lapor Kendala Operasional",
    );
    expect(global).toHaveLength(1);
    expect(global[0]?.checklist.length).toBeGreaterThanOrEqual(5);
  });

  it("aggregates position counts for admin catalog", () => {
    const counts = listPositionDailyTemplateCounts();
    expect(counts.find((row) => row.position === "SupirPA")?.activities).toBe(7);
    expect(
      counts.find((row) => row.position === "MaintenanceKebon")?.activities,
    ).toBe(8);
  });
});

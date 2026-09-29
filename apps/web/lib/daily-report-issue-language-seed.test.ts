import { describe, expect, it } from "vitest";
import { resolveDailyReportIssueLanguage } from "./daily-report-issue-language-seed";

describe("daily report issue language seed", () => {
  it("turns short grinder language into a clear maintenance work template", () => {
    const language = resolveDailyReportIssueLanguage({
      routeType: "maintenance",
      activityTitle: "Opening Bar",
      note: "grinder aneh kalibrasi",
    });

    expect(language.seed_id).toBe("maintenance-coffee-grinder");
    expect(language.subject).toBe("Mesin Kopi & Grinder");
    expect(language.steps.length).toBeGreaterThanOrEqual(4);
    expect(language.standards.join(" ")).toContain("Grinder");
  });

  it("turns informal toilet notes into a cleaning template", () => {
    const language = resolveDailyReportIssueLanguage({
      routeType: "cleaning",
      activityTitle: "Kontrol Area",
      note: "wc bau pesing",
    });

    expect(language.seed_id).toBe("cleaning-toilet");
    expect(language.subject).toBe("Toilet");
    expect(language.steps.some((step) => step.includes("sumber bau"))).toBe(true);
  });

  it("understands low-stock shorthand", () => {
    const language = resolveDailyReportIssueLanguage({
      routeType: "stock",
      activityTitle: "Closing Bar",
      note: "susu tinggal dikit",
    });

    expect(language.seed_id).toBe("stock-shortage");
    expect(language.subject).toBe("Stok Bahan");
    expect(language.standards.length).toBeGreaterThan(0);
  });

  it("uses a safe fallback when wording does not match a specific seed", () => {
    const language = resolveDailyReportIssueLanguage({
      routeType: "maintenance",
      activityTitle: "Kontrol fasilitas",
      note: "tolong dicek ya",
    });

    expect(language.seed_id).toBe("maintenance-fallback");
    expect(language.steps.length).toBeGreaterThan(0);
  });
});

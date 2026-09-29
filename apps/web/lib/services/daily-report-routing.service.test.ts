import { describe, expect, it } from "vitest";
import {
  buildDailyReportIssueTaskTitle,
  classifyDailyReportIssue,
} from "./daily-report-routing.service";

describe("daily report issue routing", () => {
  it("classifies grinder calibration as maintenance", () => {
    const route = classifyDailyReportIssue({
      note: "Maintance mesin kopi dan grinder kopi di kalibrasi",
      activityTitle: "Cek Mesin dan Grinder",
      position: "Bar",
      statusCondition: "kendala_ringan",
    });

    expect(route).toBe("maintenance");
  });

  it("builds an operational title instead of system jargon", () => {
    const title = buildDailyReportIssueTaskTitle({
      routeType: "maintenance",
      note: "Mesin kopi perlu maintenance dan grinder perlu dikalibrasi",
      activityTitle: "Opening Bar",
    });

    expect(title).toBe("Perbaikan & Alat — Mesin Kopi & Grinder");
    expect(title).not.toContain("Kendala SOP");
  });

  it("separates cleaning, stock, finance and safety issues", () => {
    const base = {
      activityTitle: "Closing Outlet",
      position: "Waiters",
      statusCondition: "kendala_ringan" as const,
    };

    expect(
      classifyDailyReportIssue({ ...base, note: "Toilet kotor dan bau pesing" }),
    ).toBe("cleaning");
    expect(
      classifyDailyReportIssue({ ...base, note: "Stok susu hampir habis" }),
    ).toBe("stock");
    expect(
      classifyDailyReportIssue({ ...base, note: "Ada selisih kas QRIS" }),
    ).toBe("finance");
    expect(
      classifyDailyReportIssue({ ...base, note: "Kabel terbuka ada percikan api" }),
    ).toBe("safety");
  });

  it("uses purchasing when staff explicitly reports a purchase need", () => {
    expect(
      classifyDailyReportIssue({
        note: "Perlu beli saringan premix dan teh",
        activityTitle: "Lapor Kendala Operasional",
        position: "Bar",
        statusCondition: "perlu_belanja",
      }),
    ).toBe("purchasing");
  });
});

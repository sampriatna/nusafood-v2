import { describe, expect, it } from "vitest";
import {
  inferDailyReportIssueRouteType,
  resolveDailyReportIssueLanguageSmart,
} from "./daily-report-issue-language-resolver";

describe("daily report informal language resolver", () => {
  it("understands short stock language", () => {
    expect(
      inferDailyReportIssueRouteType({
        activityTitle: "Closing Bar",
        note: "susu tinggal dikit",
      }),
    ).toBe("stock");
  });

  it("understands short cleaning language", () => {
    expect(
      inferDailyReportIssueRouteType({
        activityTitle: "Kontrol Area",
        note: "wc bau pesing",
      }),
    ).toBe("cleaning");
  });

  it("prefers a maintenance signal when an area word is also present", () => {
    expect(
      inferDailyReportIssueRouteType({
        activityTitle: "Kontrol Toilet",
        note: "lampu toilet mati",
      }),
    ).toBe("maintenance");
  });

  it("prefers specific coffee equipment language over generic machine seed", () => {
    const language = resolveDailyReportIssueLanguageSmart({
      routeType: "maintenance",
      activityTitle: "Opening Bar",
      note: "mesin kopi mati",
    });

    expect(language.seed_id).toBe("maintenance-coffee-grinder");
  });
});

import { describe, expect, it } from "vitest";
import { dailyReportKey, normalizeReportTitle } from "./pending-send.service";

describe("normalizeReportTitle", () => {
  it("ignores case, punctuation and a leading 'Checklist'", () => {
    expect(normalizeReportTitle("CLOSING KASIR")).toBe("closing kasir");
    expect(normalizeReportTitle("Checklist Closing Bar")).toBe("closing bar");
    expect(normalizeReportTitle("Bersihkan & siapkan area")).toBe("bersihkan siapkan area");
  });
});

describe("dailyReportKey", () => {
  it("matches a task to a daily report on the same outlet and date", () => {
    expect(dailyReportKey("o1", "2026-09-29", "CLOSING KASIR")).toBe(
      dailyReportKey("o1", "2026-09-29", "Closing Kasir"),
    );
    expect(dailyReportKey("o1", "2026-09-29", "Closing Kasir")).not.toBe(
      dailyReportKey("o2", "2026-09-29", "Closing Kasir"),
    );
  });
});

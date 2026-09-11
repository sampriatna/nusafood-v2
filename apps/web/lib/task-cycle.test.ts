import { describe, expect, it } from "vitest";
import {
  buildTaskCycleDescription,
  parseTaskCycleDescription,
} from "./task-cycle";

describe("task cycle description", () => {
  it("round-trips structured task guidance", () => {
    const description = buildTaskCycleDescription({
      purpose: "Naikkan exposure weekend Kisamen",
      trigger: "Mulai H-3",
      target: "4-5 KOL confirmed",
      nextAction: "Hubungi 8 KOL hari ini",
      doneWhen: "Minimal 4 KOL confirmed dan jadwal tercatat",
      escalation: "H-1 kurang dari 3, lapor leader dengan recovery plan",
    });

    expect(parseTaskCycleDescription(description)).toEqual({
      purpose: "Naikkan exposure weekend Kisamen",
      trigger: "Mulai H-3",
      target: "4-5 KOL confirmed",
      nextAction: "Hubungi 8 KOL hari ini",
      doneWhen: "Minimal 4 KOL confirmed dan jadwal tercatat",
      escalation: "H-1 kurang dari 3, lapor leader dengan recovery plan",
      structured: true,
    });
  });

  it("keeps legacy descriptions usable", () => {
    const parsed = parseTaskCycleDescription("Follow up KOL Kisamen");

    expect(parsed.structured).toBe(false);
    expect(parsed.purpose).toBe("Follow up KOL Kisamen");
    expect(parsed.nextAction).toContain("Buka tugas");
    expect(parsed.doneWhen).toContain("bukti hasil");
  });
});

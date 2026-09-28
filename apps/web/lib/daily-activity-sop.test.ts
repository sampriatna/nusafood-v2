import { describe, expect, it } from "vitest";
import {
  encodeSopDescription,
  parseSopDescription,
  shiftCodesForOutlet,
  shiftHours,
  shiftTimeLabel,
  stripOperationalPrefix,
  templateAppliesToShift,
} from "./daily-activity-sop";

describe("daily activity SOP metadata", () => {
  it("round-trips instruction and shift metadata", () => {
    const raw = encodeSopDescription(
      {
        why_text: "Supaya pelayanan konsisten",
        operational_impact: "Customer menunggu",
        instruction_note: "Cek area dari sudut pandang customer",
        shift_codes: ["1K", "3K"],
      },
      "Area siap",
    );
    expect(parseSopDescription(raw)).toMatchObject({
      why_text: "Supaya pelayanan konsisten",
      operational_impact: "Customer menunggu",
      instruction_note: "Cek area dari sudut pandang customer",
      shift_codes: ["1K", "3K"],
      fallback: "Area siap",
    });
  });

  it("keeps legacy descriptions readable", () => {
    expect(parseSopDescription("Instruksi lama")).toMatchObject({
      instruction_note: "Instruksi lama",
      fallback: "Instruksi lama",
    });
  });

  it("filters shift-specific templates safely", () => {
    expect(templateAppliesToShift(["1K"], "1K")).toBe(true);
    expect(templateAppliesToShift(["1K"], "2K")).toBe(false);
    expect(templateAppliesToShift(["1K"], null)).toBe(false);
    expect(templateAppliesToShift(undefined, null)).toBe(true);
  });

  it("maps outlet shifts to the equivalent KBU SOP", () => {
    // Kisamen: 1R = opening + handover (1K), 2R = takeover + final closing (3K)
    expect(templateAppliesToShift(["1K"], "1R", "Opening")).toBe(true);
    expect(templateAppliesToShift(["3K"], "1R", "Closing")).toBe(false);
    expect(templateAppliesToShift(["3K"], "2R", "Closing")).toBe(true);
    expect(templateAppliesToShift(["2K"], "2R", "Monitoring")).toBe(false);
    // Samtaro 1S: opening/monitoring pakai 1K, closing pakai final closing 3K (tanpa handover)
    expect(templateAppliesToShift(["1K"], "1S", "Opening")).toBe(true);
    expect(templateAppliesToShift(["1K"], "1S", "Monitoring")).toBe(true);
    expect(templateAppliesToShift(["1K"], "1S", "Closing")).toBe(false);
    expect(templateAppliesToShift(["3K"], "1S", "Closing")).toBe(true);
    expect(templateAppliesToShift(["3K"], "1S", "Opening")).toBe(false);
    // Longshift: 1LR opening s.d. final closing, 1LK operasional s.d. final closing
    expect(templateAppliesToShift(["1K"], "1LR", "Opening")).toBe(true);
    expect(templateAppliesToShift(["3K"], "1LR", "Closing")).toBe(true);
    expect(templateAppliesToShift(["1K"], "1LR", "Closing")).toBe(false);
    expect(templateAppliesToShift(["3K"], "1LK", "Closing")).toBe(true);
    expect(templateAppliesToShift(["1K"], "1LK", "Opening")).toBe(false);
    expect(shiftTimeLabel("1LK")).toBe("Longshift 1LK · 09:45–22:00");
    // Tag kode sendiri selalu berlaku
    expect(templateAppliesToShift(["1S"], "1S", "Closing")).toBe(true);
  });

  it("lists shift codes per outlet", () => {
    expect(shiftCodesForOutlet("KBU")).toEqual(["1K", "2K", "3K", "1LK"]);
    expect(shiftCodesForOutlet("kisamen")).toEqual(["1R", "2R", "1LR"]);
    expect(shiftCodesForOutlet("SAMTARO")).toEqual(["1S"]);
    expect(shiftCodesForOutlet("GENERAL")).toHaveLength(8);
  });

  it("uses Sunday hours for Samtaro", () => {
    expect(shiftHours("1S", "2026-09-27")).toEqual({ start: "08:00", end: "18:00" }); // Minggu
    expect(shiftHours("1S", "2026-09-28")).toEqual({ start: "10:45", end: "21:00" }); // Senin
    expect(shiftHours("1K", "2026-09-27")).toEqual({ start: "09:00", end: "19:00" });
    expect(shiftTimeLabel("1R")).toBe("Shift 1R · 09:30–19:30");
  });

  it("removes internal operational priority from staff copy", () => {
    expect(stripOperationalPrefix("P1 · TUGAS INTI — Outlet siap menerima customer")).toBe(
      "Outlet siap menerima customer",
    );
  });
});

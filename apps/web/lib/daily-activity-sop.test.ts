import { describe, expect, it } from "vitest";
import {
  encodeSopDescription,
  parseSopDescription,
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

  it("removes internal operational priority from staff copy", () => {
    expect(stripOperationalPrefix("P1 · TUGAS INTI — Outlet siap menerima customer")).toBe(
      "Outlet siap menerima customer",
    );
  });
});

import { describe, expect, it } from "vitest";

function isUnknownGasAction(error?: string): boolean {
  return Boolean(error?.includes("UNKNOWN_ACTION"));
}

describe("wa-notify-disciplinary", () => {
  it("detects UNKNOWN_ACTION from GAS", () => {
    expect(isUnknownGasAction("UNKNOWN_ACTION: sendDisciplinaryWhatsApp")).toBe(
      true,
    );
    expect(isUnknownGasAction("GAS_REJECTED")).toBe(false);
  });
});

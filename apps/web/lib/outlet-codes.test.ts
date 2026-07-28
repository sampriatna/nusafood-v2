import { describe, expect, it } from "vitest";
import { normalizeOutletCode } from "./outlet-codes";

describe("normalizeOutletCode", () => {
  it("maps display labels to canonical codes", () => {
    expect(normalizeOutletCode("Kisamen")).toBe("KISAMEN");
    expect(normalizeOutletCode("Samtaro Express")).toBe("SAMTARO");
    expect(normalizeOutletCode("KBU")).toBe("KBU");
    expect(normalizeOutletCode("General (Pusat)")).toBe("GENERAL");
    expect(normalizeOutletCode("Nusa Fishing")).toBe("NUSAFISHING");
  });
});

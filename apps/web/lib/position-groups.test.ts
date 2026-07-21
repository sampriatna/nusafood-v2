import { describe, expect, it } from "vitest";
import {
  normalizePositionGroup,
  resolveStaffPositionGroup,
  sanitizeStaffPosition,
} from "./position-groups";

describe("position-groups", () => {
  it("maps legacy jabatan text to standard groups", () => {
    expect(normalizePositionGroup("Public Area")).toBe("PA");
    expect(normalizePositionGroup("Pramusaji")).toBe("Waiters");
    expect(normalizePositionGroup("Barista")).toBe("Bar");
    expect(normalizePositionGroup("Cook")).toBe("Dapur");
  });

  it("resolves staff position for form select", () => {
    expect(resolveStaffPositionGroup("Public Area")).toBe("PA");
    expect(resolveStaffPositionGroup("Waiters")).toBe("Waiters");
    expect(resolveStaffPositionGroup("unknown role")).toBe("");
  });

  it("sanitizes staff position on save", () => {
    expect(sanitizeStaffPosition("Public Area")).toBe("PA");
    expect(sanitizeStaffPosition("Waiters")).toBe("Waiters");
    expect(sanitizeStaffPosition("  ")).toBeNull();
  });
});

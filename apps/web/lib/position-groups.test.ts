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
    expect(normalizePositionGroup("Kasir")).toBe("Kasir");
    expect(normalizePositionGroup("Purchasing")).toBe("Purchasing");
    expect(normalizePositionGroup("Gudang")).toBe("Gudang");
    expect(normalizePositionGroup("Produksi NF")).toBe("ProduksiNF");
    expect(normalizePositionGroup("Produksi FnB")).toBe("ProduksiFnB");
    expect(normalizePositionGroup("Finance")).toBe("Finance");
    expect(normalizePositionGroup("Design / Editor")).toBe("Design");
  });

  it("resolves staff position for form select", () => {
    expect(resolveStaffPositionGroup("Public Area")).toBe("PA");
    expect(resolveStaffPositionGroup("Waiters")).toBe("Waiters");
    expect(resolveStaffPositionGroup("CS NF")).toBe("CSNF");
    expect(resolveStaffPositionGroup("unknown role")).toBe("");
  });

  it("sanitizes staff position on save", () => {
    expect(sanitizeStaffPosition("Public Area")).toBe("PA");
    expect(sanitizeStaffPosition("Kasir")).toBe("Kasir");
    expect(sanitizeStaffPosition("Waiters")).toBe("Waiters");
    expect(sanitizeStaffPosition("  ")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { normalizePicPosition, pickCandidates } from "./recurring-pic.service";

const staff = [
  { staffId: "S1", name: "Andi", waNumber: "0811", position: "Kasir" },
  { staffId: "S2", name: "Budi", waNumber: "0812", position: "Kasir" },
  { staffId: "S3", name: "Citra", waNumber: "0813", position: "Waiters" },
];

describe("pickCandidates", () => {
  it("prefers staff scheduled for the position that day", () => {
    const duties = new Map([["S3", ["Kasir"]]]);
    const secondary = new Map([["S3", ["Kasir"]]]);
    const result = pickCandidates("Kasir", staff, duties, secondary);
    expect(result.map((c) => [c.name, c.scheduled])).toEqual([["Citra", true]]);
  });

  it("falls back to staff whose primary job matches when nobody is scheduled", () => {
    const result = pickCandidates("Kasir", staff, new Map(), new Map());
    expect(result.map((c) => c.name)).toEqual(["Andi", "Budi"]);
  });

  it("excludes staff scheduled for another position that day", () => {
    const duties = new Map([["S1", ["Waiters"]]]);
    const secondary = new Map([["S1", ["Waiters"]]]);
    const result = pickCandidates("Kasir", staff, duties, secondary);
    expect(result.map((c) => c.name)).toEqual(["Budi"]);
  });

  it("ignores duty positions the staff is not qualified for", () => {
    const duties = new Map([["S3", ["Kasir"]]]);
    const result = pickCandidates("Kasir", staff, duties, new Map());
    // Citra tidak punya jabatan tambahan Kasir → jadwal diabaikan, kembali ke jabatan utama
    expect(result.map((c) => c.name)).toEqual(["Andi", "Budi"]);
  });
});

describe("normalizePicPosition", () => {
  it("accepts standard groups and rejects unknown", () => {
    expect(normalizePicPosition("Kasir")).toBe("Kasir");
    expect(normalizePicPosition("")).toBeNull();
    expect(normalizePicPosition("Astronot")).toBeNull();
  });
});

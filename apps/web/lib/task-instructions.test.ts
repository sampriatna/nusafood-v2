import { describe, expect, it } from "vitest";
import { parseTaskInstructions } from "./task-instructions";

describe("parseTaskInstructions", () => {
  it("splits AI format into sections with checkable steps", () => {
    const sections = parseTaskInstructions(
      [
        "Tujuan:",
        "Area kasir rapi sebelum tutup.",
        "",
        "Langkah:",
        "1. Hitung uang kas",
        "2. Cocokkan dengan laporan POS",
        "",
        "Standar selesai:",
        "- Selisih kas 0",
        "- Kirim foto meja kasir",
      ].join("\n"),
    );
    expect(sections.map((s) => [s.title, s.kind])).toEqual([
      ["Tujuan", "text"],
      ["Langkah", "steps"],
      ["Standar selesai", "bullets"],
    ]);
    expect(sections[1].items).toEqual([
      "Hitung uang kas",
      "Cocokkan dengan laporan POS",
    ]);
  });

  it("turns free-form multi-line text into steps", () => {
    const [section] = parseTaskInstructions("clear area kasir\nclear so");
    expect(section.kind).toBe("steps");
    expect(section.items).toEqual(["clear area kasir", "clear so"]);
  });

  it("returns nothing for empty text", () => {
    expect(parseTaskInstructions("")).toEqual([]);
  });
});

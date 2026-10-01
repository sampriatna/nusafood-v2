import { describe, expect, it } from "vitest";
import { getTemplate, PROJECT_TEMPLATES, validateStructure } from "./project-templates";

describe("project templates", () => {
  it("semua template valid dan siap publish (bagian → milestone → langkah)", () => {
    for (const t of PROJECT_TEMPLATES) expect(validateStructure(t.structure), t.id).toEqual([]);
  });
  it("id unik", () => {
    expect(new Set(PROJECT_TEMPLATES.map((t) => t.id)).size).toBe(PROJECT_TEMPLATES.length);
  });
  it("tidak membawa PIC / tanggal / hasil kerja", () => {
    expect(JSON.stringify(PROJECT_TEMPLATES)).not.toMatch(/owner|deadline|evidence_url|isChecked/);
  });
  it("validateStructure menangkap struktur kosong", () => {
    expect(validateStructure({ workstreams: [] })).toHaveLength(1);
    expect(validateStructure({ workstreams: [{ name: "A", milestones: [{ title: "M", steps: [] }] }] })).toHaveLength(1);
  });
  it("getTemplate", () => {
    expect(getTemplate("produk-baru")?.name).toBe("Produk Baru");
    expect(getTemplate("x")).toBeNull();
  });
});

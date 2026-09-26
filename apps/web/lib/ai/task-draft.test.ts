import { describe, expect, it } from "vitest";
import { buildTaskDraftPrompt } from "./task-draft";

describe("buildTaskDraftPrompt", () => {
  it("includes note, context and category focus", () => {
    const prompt = buildTaskDraftPrompt({
      note: "hood dapur berminyak",
      outlet: "KBU",
      area: "Dapur",
      category: "Cleaning",
      category_label: "Kebersihan",
    });
    expect(prompt).toContain("Catatan admin: hood dapur berminyak");
    expect(prompt).toContain("Outlet: KBU");
    expect(prompt).toContain("Jenis Tugas: Kebersihan");
    expect(prompt).toContain("bahan pembersih");
  });

  it("falls back to general focus for unknown category", () => {
    const prompt = buildTaskDraftPrompt({ note: "cek sesuatu", category: "Xyz" });
    expect(prompt).toContain("tugas operasional harian");
  });

  it("includes existing draft text when provided", () => {
    const prompt = buildTaskDraftPrompt({
      note: "x",
      current_title: "Bersihkan hood",
      current_description: "pakai degreaser",
    });
    expect(prompt).toContain("Bersihkan hood");
    expect(prompt).toContain("pakai degreaser");
  });
});

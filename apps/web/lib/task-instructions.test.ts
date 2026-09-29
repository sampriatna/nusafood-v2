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

  it("keeps routed issue context as text and only work items as checklist", () => {
    const sections = parseTaskInstructions(`Temuan dari Bintang Ali Hamid (Bar · KBU).
Masalah:
Mesin kopi perlu maintenance dan grinder perlu dikalibrasi.
Yang dikerjakan:
1. Cek kondisi mesin kopi dan grinder.
2. Lakukan maintenance yang diperlukan.
3. Kalibrasi grinder lalu uji hasilnya.
4. Pastikan kedua alat kembali normal dan aman dipakai.
5. Upload foto hasil dan tulis tindakan yang dilakukan.
Catatan:
Jika butuh sparepart, biaya, atau bantuan lain, catat di laporan.`);

    const steps = sections.find((section) => section.title === "Yang dikerjakan");
    const problem = sections.find((section) => section.title === "Masalah");
    const note = sections.find((section) => section.title === "Catatan");

    expect(problem).toMatchObject({
      kind: "text",
      items: ["Mesin kopi perlu maintenance dan grinder perlu dikalibrasi."],
    });
    expect(steps).toMatchObject({ kind: "steps" });
    expect(steps?.items).toHaveLength(5);
    expect(steps?.items[0]).toBe("Cek kondisi mesin kopi dan grinder.");
    expect(note).toMatchObject({ kind: "text" });
  });

  it("auto-splits routed tindak lanjut into actionable steps", () => {
    const sections = parseTaskInstructions(`Temuan dari Bintang Ali Hamid (Bar · KBU).
Kategori: Perbaikan & alat
Kegiatan asal: Opening Bar
Masalah:
Mesin kopi perlu maintenance dan grinder perlu dikalibrasi.
Tindak lanjut:
Cek kondisi, lakukan perbaikan/kalibrasi yang diperlukan, uji fungsi, lalu laporkan hasil dan kebutuhan sparepart bila ada.`);

    const steps = sections.find((section) => section.title === "Tindak lanjut");

    expect(steps).toEqual({
      title: "Tindak lanjut",
      kind: "steps",
      items: [
        "Cek kondisi",
        "lakukan perbaikan/kalibrasi yang diperlukan",
        "uji fungsi",
        "laporkan hasil dan kebutuhan sparepart bila ada",
      ],
    });
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

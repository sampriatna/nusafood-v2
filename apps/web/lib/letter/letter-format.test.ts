import { describe, expect, it } from "vitest";
import {
  checkLetterTimeline,
  formatTanggal,
  formatTanggalJam,
  humanizeDatesInText,
  outletLabel,
  presentChronology,
  presentViolation,
  romanLevel,
  tidySentence,
} from "./letter-format";

describe("tanggal", () => {
  it("formats date-only without timezone shift", () => {
    expect(formatTanggal("2026-08-02")).toBe("2 Agustus 2026");
  });
  it("formats ISO in WIB", () => {
    expect(formatTanggalJam("2026-08-27T14:05:00.000Z")).toBe("27 Agustus 2026, 21.05 WIB");
  });
  it("replaces raw dates inside text", () => {
    expect(humanizeDatesInText("deadline 2026-08-27T14:05:00.000Z, surat 2026-08-02")).toBe(
      "deadline 27 Agustus 2026, 21.05 WIB, surat 2 Agustus 2026",
    );
  });
});

describe("teks", () => {
  it("tidies without changing words", () => {
    expect(tidySentence("  kotor  pembeli jijik karena wc ")).toBe("Kotor pembeli jijik karena wc.");
    expect(tidySentence("1. hitung kas")).toBe("1. hitung kas");
  });
  it("rewrites the legacy system chronology", () => {
    const out = presentChronology(
      'Task TASK-20260802-070 berjudul "dfg" memiliki deadline 2026-08-27T14:05:00.000Z. Status saat ini: OPENED.',
    );
    expect(out).toContain('"dfg" (TASK-20260802-070)');
    expect(out).toContain("27 Agustus 2026, 21.05 WIB");
    expect(out).toContain("sudah dibuka namun belum dilaporkan");
    expect(out).not.toContain("OPENED");
  });
  it("rewrites legacy violation text", () => {
    expect(presentViolation('Task "dfg" belum selesai sesuai standar.')).toBe(
      'Tugas "dfg" belum diselesaikan sesuai standar kerja yang ditetapkan.',
    );
  });
  it("labels outlet and level", () => {
    expect(outletLabel("KBU")).toBe("Kopi Buri Umah (KBU)");
    expect(outletLabel("KBU", "KBU")).toBe("Kopi Buri Umah (KBU)");
    expect(outletLabel("XYZ")).toBe("XYZ");
    expect(romanLevel(2)).toBe("II");
  });
});

describe("checkLetterTimeline", () => {
  it("blocks correction deadline before letter date", () => {
    const issues = checkLetterTimeline({ incident_date: "2026-08-20", correction_deadline: "2026-08-15" });
    expect(issues.some((i) => i.level === "error")).toBe(true);
  });
  it("warns when letter is issued before the task deadline", () => {
    const issues = checkLetterTimeline({
      incident_date: "2026-08-02",
      correction_deadline: "2026-08-16",
      task_deadline: "2026-08-27T14:05:00.000Z",
      today: "2026-09-01",
    });
    expect(issues.map((i) => i.level)).toEqual(["warning", "warning"]);
  });
  it("is quiet for a sane timeline", () => {
    expect(
      checkLetterTimeline({
        incident_date: "2026-08-28",
        correction_deadline: "2026-09-04",
        task_deadline: "2026-08-27T14:05:00.000Z",
        today: "2026-09-01",
      }),
    ).toEqual([]);
  });
});

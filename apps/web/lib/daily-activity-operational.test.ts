import { describe, expect, it } from "vitest";
import { classifyOperationalTemplate } from "./daily-activity-operational";

describe("daily activity operational taxonomy", () => {
  it("marks cash reconciliation as critical report", () => {
    expect(
      classifyOperationalTemplate({
        title: "Closing & Rekonsiliasi Kas Harian",
        category: "Closing",
        position_group: "Kasir",
      }),
    ).toEqual({
      priority: "P0",
      workType: "LAPORAN",
      label: "P0 · LAPORAN",
    });
  });

  it("marks customer hygiene work as P1 core work", () => {
    expect(
      classifyOperationalTemplate({
        title: "Jaga Area Customer, Toilet & Sampah Tetap Siap",
        category: "Cleaning",
        position_group: "PA",
      }),
    ).toEqual({
      priority: "P1",
      workType: "TUGAS INTI",
      label: "P1 · TUGAS INTI",
    });
  });

  it("marks monitoring as control", () => {
    expect(
      classifyOperationalTemplate({
        title: "Kendali Bisnis & Tindak Lanjut Operasional",
        category: "Monitoring",
        position_group: "LeaderOutlet",
      }),
    ).toEqual({
      priority: "P1",
      workType: "KONTROL",
      label: "P1 · KONTROL",
    });
  });

  it("marks issue quick reports as follow up", () => {
    expect(
      classifyOperationalTemplate({
        title: "Lapor Kendala Operasional",
        category: "Kendala",
        kind: "issue_quick",
      }),
    ).toEqual({
      priority: "P1",
      workType: "TINDAK LANJUT",
      label: "P1 · TINDAK LANJUT",
    });
  });
});

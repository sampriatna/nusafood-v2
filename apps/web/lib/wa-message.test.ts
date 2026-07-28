import { describe, expect, it } from "vitest";
import type { DisciplinaryLetter } from "@nusafood/types";
import { buildDisciplinaryWaMessage, buildTaskWaMessage, normalizeWa } from "./wa-message";

const sampleLetter: DisciplinaryLetter = {
  id: "abc",
  letter_number: "ST/KBU/2026/07/001",
  type: "TEGURAN",
  level: 1,
  status: "DRAFT",
  employee_id: "EMP001",
  employee_name_snapshot: "Budi",
  employee_position_snapshot: "Staff",
  outlet_name_snapshot: "KBU",
  source_type: "TASK_LATE",
  incident_date: "2026-07-28",
  created_by: "admin",
  title: "Teguran keterlambatan",
  chronology: "Terlambat submit laporan",
  violation_detail: "Deadline lewat 2 jam",
  correction_instruction: "Submit tepat waktu",
  created_at: "2026-07-28T00:00:00.000Z",
  updated_at: "2026-07-28T00:00:00.000Z",
};

describe("normalizeWa", () => {
  it("converts leading 0 to 62", () => {
    expect(normalizeWa("081234567890")).toBe("6281234567890");
  });
});

describe("buildDisciplinaryWaMessage", () => {
  it("includes letter number and employee name", () => {
    const msg = buildDisciplinaryWaMessage(sampleLetter);
    expect(msg).toContain("ST/KBU/2026/07/001");
    expect(msg).toContain("*Budi*");
    expect(msg).toContain("Surat Teguran Level 1");
  });
});

describe("buildTaskWaMessage", () => {
  it("includes task title and report link", () => {
    const msg = buildTaskWaMessage({
      task_title: "Bersihkan hood",
      pic_name: "Andi",
      deadline: "2026-07-29T10:00:00.000Z",
      report_link: "https://tugas.nf3.company/report/TASK-1?token=abc",
      outlet: "KBU",
    });
    expect(msg).toContain("Bersihkan hood");
    expect(msg).toContain("tugas.nf3.company");
    expect(msg).toContain("*Andi*");
  });
});

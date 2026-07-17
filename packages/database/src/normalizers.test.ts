import { describe, expect, it } from "vitest";
import {
  coerceBoolean,
  normalizeOutletCode,
  normalizeStaffRow,
  normalizeStatus,
  normalizeTaskRow,
} from "./normalizers";

describe("normalizers", () => {
  it("coerces YES/TRUE to boolean", () => {
    expect(coerceBoolean("YES")).toBe(true);
    expect(coerceBoolean("NO")).toBe(false);
    expect(coerceBoolean(true)).toBe(true);
  });

  it("maps outlet names to codes", () => {
    expect(normalizeOutletCode("KBU")).toBe("KBU");
    expect(normalizeOutletCode("Kopi Buri Umah")).toBe("KBU");
    expect(normalizeOutletCode("Kisamen")).toBe("KISAMEN");
    expect(normalizeOutletCode("Samtaro Express")).toBe("SAMTARO");
  });

  it("normalizes task row from GAS-like payload", () => {
    const row = normalizeTaskRow({
      task_id: "TASK-20260717-0001",
      token: "abc",
      outlet: "KBU",
      area: "Bar",
      category: "Cleaning",
      task_title: "Close bar",
      pic_name: "Andi",
      pic_wa: "6281",
      deadline: "2026-07-17T23:00:00+07:00",
      status: "open",
      is_late: "YES",
      checklist_mode: "YES",
    });

    expect(row).not.toBeNull();
    expect(row?.status).toBe("OPEN");
    expect(row?.isLate).toBe(true);
    expect(row?.checklistMode).toBe(true);
    expect(normalizeStatus("revisi")).toBe("REVISI");
  });

  it("normalizes staff_name → name", () => {
    const staff = normalizeStaffRow({
      staff_id: "STF-1",
      staff_name: "Andi",
      wa_number: "6281",
      outlet: "KBU",
      is_active: "TRUE",
      role: "STAFF",
    });
    expect(staff?.name).toBe("Andi");
    expect(staff?.status).toBe("ACTIVE");
  });
});

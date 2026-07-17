import { describe, expect, it } from "vitest";
import {
  coerceBoolean,
  normalizeChecklistItemRow,
  normalizeChecklistTemplateRow,
  normalizeOutletCode,
  normalizeRecurringTemplateRow,
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

  it("normalizes checklist template from v1 sheet row", () => {
    const row = normalizeChecklistTemplateRow({
      template_id: "CHKM-20260605-001",
      template_name: "Checklist Opening Kitchen",
      outlet: "KBU",
      area: "Dapur",
      checklist_title: "CHECKLIST OPENING KITCHEN",
      requires_photo: "TRUE",
      active_status: "TRUE",
    });
    expect(row?.templateId).toBe("CHKM-20260605-001");
    expect(row?.outletCode).toBe("KBU");
    expect(row?.requiresPhoto).toBe(true);
    expect(row?.checklistTitle).toBe("CHECKLIST OPENING KITCHEN");
  });

  it("normalizes checklist item row", () => {
    const row = normalizeChecklistItemRow({
      checklist_item_id: "CHKI-1",
      template_id: "CHKM-1",
      item_order: 2,
      item_text: "Cek kulkas",
      requires_photo: "YES",
      is_required: "TRUE",
    });
    expect(row?.itemOrder).toBe(2);
    expect(row?.requiresPhoto).toBe(true);
  });

  it("normalizes recurring template row", () => {
    const row = normalizeRecurringTemplateRow({
      template_id: "REC-001",
      template_name: "Opening Dapur",
      outlet: "Kopi Buri Umah",
      area: "Dapur",
      category: "Kitchen",
      pic_name: "Budi",
      pic_wa: "6281",
      task_title: "Opening",
      repeat_type: "daily",
      repeat_days: ["senin", "rabu"],
      repeat_time: "07:00",
      deadline_time: "09:00",
      requires_photo: true,
      active_status: true,
    });
    expect(row?.outletCode).toBe("KBU");
    expect(row?.repeatType).toBe("daily");
    expect(row?.repeatDays).toEqual(["senin", "rabu"]);
  });
});

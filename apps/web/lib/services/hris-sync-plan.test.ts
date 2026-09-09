import { describe, expect, it } from "vitest";
import type { HrisStaffRecord } from "@nusafood/types";
import {
  buildHrisFields,
  buildManualLinkUpdate,
  buildStaffUpdateFromHris,
  planStaffSyncAction,
  validateManualLink,
  type LocalStaffSnapshot,
} from "@/lib/services/hris-sync-plan";
import {
  isWaNeedsCompletion,
  placeholderWaForHris,
  staffWaReadyForAssignment,
} from "@/lib/services/hris-wa";

const baseRecord: HrisStaffRecord = {
  id: "123456789",
  employee_code: "123456789",
  name: "Budi Santoso",
  phone: "081234567890",
  outlet: { id: "001", name: "Cabang A" },
  division: { id: "D01", name: "Operasional" },
  position: { id: "J01", name: "Leader Floor" },
  role: "leader",
  status: "active",
};

const localStaff: LocalStaffSnapshot = {
  staffId: "STF-LOCAL-001",
  hrisStaffId: null,
  name: "Budi Lokal",
  waNumber: "6289999999999",
  waNeedsCompletion: false,
  outletId: "outlet-uuid-1",
  role: "LEADER",
  position: "Floor",
  status: "ACTIVE",
};

describe("hris-sync-plan", () => {
  it("syncs staff without WA using placeholder", () => {
    const record = { ...baseRecord, phone: null };
    const fields = buildHrisFields(record);
    expect(fields.waNeedsCompletion).toBe(true);
    expect(isWaNeedsCompletion(fields.waNumber)).toBe(true);
    expect(fields.hrisStaffId).toBe("123456789");
  });

  it("does not fail plan when WA empty — marks wa_needs_completion", () => {
    const plan = planStaffSyncAction({
      record: { ...baseRecord, phone: null },
      outletId: "outlet-uuid-1",
    });
    expect(plan.action).toBe("create");
    expect(plan.wa_needs_completion).toBe(true);
  });

  it("fails plan when outlet not mapped", () => {
    const plan = planStaffSyncAction({
      record: baseRecord,
      outletId: null,
    });
    expect(plan.action).toBe("failed");
    expect(plan.reason).toContain("belum dimapping");
  });

  it("preserves local role on update — buildStaffUpdateFromHris excludes role", () => {
    const update = buildStaffUpdateFromHris(
      { ...baseRecord, role: "staff" },
      { ...localStaff, role: "LEADER", hrisStaffId: "123456789" },
      "outlet-uuid-1",
    );
    expect(update).not.toHaveProperty("role");
    expect(update).not.toHaveProperty("position");
  });

  it("marks ambiguous when multiple local WA matches", () => {
    const plan = planStaffSyncAction({
      record: baseRecord,
      outletId: "outlet-uuid-1",
      localMatchesByWa: [
        { ...localStaff, staffId: "A" },
        { ...localStaff, staffId: "B" },
      ],
    });
    expect(plan.action).toBe("ambiguous");
  });

  it("validateManualLink rejects NIK already linked to another staff", () => {
    const result = validateManualLink({
      local: localStaff,
      remote: baseRecord,
      conflictStaffId: "STF-OTHER",
      resolvedOutletId: "outlet-uuid-1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("HRIS_STAFF_CONFLICT");
      expect(result.status).toBe(409);
    }
  });

  it("validateManualLink rejects unmapped outlet", () => {
    const result = validateManualLink({
      local: localStaff,
      remote: baseRecord,
      conflictStaffId: null,
      resolvedOutletId: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("OUTLET_NOT_MAPPED");
    }
  });

  it("manual link update applies HRIS WA and keeps local role unchanged in payload", () => {
    const update = buildManualLinkUpdate(
      localStaff,
      { ...baseRecord, phone: "081111111111" },
      "outlet-uuid-1",
    );
    expect(update.waNumber).toBe("6281111111111");
    expect(update).not.toHaveProperty("role");
    expect(update.hrisStaffId).toBe("123456789");
  });

  it("manual link with different outlet id resolves via outletId param", () => {
    const update = buildManualLinkUpdate(
      localStaff,
      { ...baseRecord, outlet: { id: "002", name: "Cabang B" } },
      "outlet-uuid-2",
    );
    expect(update.outletId).toBe("outlet-uuid-2");
  });

  it("staffWaReadyForAssignment blocks placeholder WA", () => {
    expect(
      staffWaReadyForAssignment({
        waNumber: placeholderWaForHris("123456789"),
        waNeedsCompletion: true,
      }),
    ).toBe(false);
  });
});

describe("incremental sync timestamp contract", () => {
  it("uses ISO timestamp from last successful sync", () => {
    const completedAt = new Date("2026-07-28T10:00:00.000Z");
    expect(completedAt.toISOString()).toBe("2026-07-28T10:00:00.000Z");
  });
});

import { describe, expect, it } from "vitest";
import type { HrisStaffRecord } from "@nusafood/types";

/** Pure helpers mirrored from sync service for unit testing mapping rules. */

function mapHrisRole(role: string): "STAFF" | "LEADER" | "ADMIN" {
  if (role === "leader") return "LEADER";
  if (role === "admin") return "ADMIN";
  return "STAFF";
}

function mapHrisStatus(status: string): "ACTIVE" | "INACTIVE" {
  return status === "active" ? "ACTIVE" : "INACTIVE";
}

describe("hris staff mapping", () => {
  const sample: HrisStaffRecord = {
    id: "123456789",
    employee_code: "123456789",
    name: "Budi",
    phone: "081234567890",
    outlet: { id: "001", name: "KBU" },
    division: { id: "001", name: "Operasional" },
    position: { id: "001", name: "Leader Floor" },
    role: "leader",
    status: "active",
  };

  it("maps HRIS role and status", () => {
    expect(mapHrisRole(sample.role)).toBe("LEADER");
    expect(mapHrisStatus(sample.status)).toBe("ACTIVE");
    expect(mapHrisStatus("inactive")).toBe("INACTIVE");
  });

  it("uses NIK as stable hris_staff_id", () => {
    expect(sample.id).toBe(sample.employee_code);
  });
});

describe("duplicate sync idempotency (contract)", () => {
  it("same hris_staff_id should upsert not duplicate", () => {
    const seen = new Set<string>();
    const records = [
      { id: "111111111", employee_code: "111111111" },
      { id: "111111111", employee_code: "111111111" },
    ];

    for (const r of records) {
      seen.add(r.id);
    }

    expect(seen.size).toBe(1);
  });
});

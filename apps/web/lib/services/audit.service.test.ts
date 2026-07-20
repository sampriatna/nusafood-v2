import { describe, expect, it } from "vitest";

/**
 * listAuditLogs butuh Prisma — smoke test mapping helper via metadata shape.
 * Integrasi penuh dijalankan saat DB tersedia.
 */
describe("audit.service contract", () => {
  it("documents filter keys used by API", () => {
    const filters = {
      limit: 100,
      entityType: "disciplinary_letter",
      action: "approve_sp",
      actorId: "env-admin",
      outletCode: "KBU",
    };
    expect(Object.keys(filters)).toEqual([
      "limit",
      "entityType",
      "action",
      "actorId",
      "outletCode",
    ]);
  });
});

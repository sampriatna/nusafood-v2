import { describe, expect, it } from "vitest";
import { isTaskDeletable } from "./task-rules";
import { outletShortName } from "./outlet-codes";

describe("isTaskDeletable", () => {
  it("allows tasks not yet opened", () => {
    expect(isTaskDeletable({ status: "CREATED" })).toBe(true);
    expect(isTaskDeletable({ status: "SENT" })).toBe(true);
  });
  it("blocks tasks with staff activity", () => {
    expect(isTaskDeletable({ status: "OPENED" })).toBe(false);
    expect(isTaskDeletable({ status: "WAITING_VERIFICATION" })).toBe(false);
    expect(isTaskDeletable({ status: "SENT", opened_at: "2026-09-27T01:00:00Z" })).toBe(false);
  });
});

describe("outletShortName", () => {
  it("maps codes to readable names", () => {
    expect(outletShortName("KISAMEN")).toBe("Kisamen");
    expect(outletShortName("GENERAL")).toBe("General (Pusat)");
    expect(outletShortName("KBU")).toBe("KBU");
    expect(outletShortName("OTHER")).toBe("OTHER");
  });
});

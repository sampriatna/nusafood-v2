import { describe, expect, it } from "vitest";
import { buildReportLink, generateTaskId, generateToken } from "./id";

describe("id helpers", () => {
  it("generates TASK-YYYYMMDD-XXX", () => {
    expect(generateTaskId(3)).toMatch(/^TASK-\d{8}-003$/);
  });

  it("generates 32-char token", () => {
    expect(generateToken(32)).toHaveLength(32);
  });

  it("builds report link path", () => {
    expect(buildReportLink("TASK-1", "abc")).toContain(
      "/report/TASK-1?token=abc",
    );
  });
});

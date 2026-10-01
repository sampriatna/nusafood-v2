import { describe, expect, it } from "vitest";
import { buildReportLink, generateTaskId, generateToken, getAppOrigin, isSafeMediaUrl } from "./id";

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

  it("prefers NEXT_PUBLIC_APP_URL", () => {
    expect(getAppOrigin({ NEXT_PUBLIC_APP_URL: "https://tugas.nf3.company/" })).toBe("https://tugas.nf3.company");
    expect(getAppOrigin({ NEXT_PUBLIC_APP_URL: "tugas.nf3.company" })).toBe("https://tugas.nf3.company");
  });

  it("ignores localhost on Vercel and falls back to the production domain", () => {
    expect(
      getAppOrigin({
        VERCEL: "1",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        VERCEL_PROJECT_PRODUCTION_URL: "tugas.nf3.company",
      }),
    ).toBe("https://tugas.nf3.company");
    expect(getAppOrigin({ VERCEL: "1", VERCEL_PROJECT_PRODUCTION_URL: "tugas.nf3.company" })).toBe(
      "https://tugas.nf3.company",
    );
  });

  it("keeps localhost for local development", () => {
    expect(getAppOrigin({ NEXT_PUBLIC_APP_URL: "http://localhost:3000" })).toBe("http://localhost:3000");
    expect(getAppOrigin({})).toBe("");
  });

  it("only accepts http(s) and inline images as media URLs", () => {
    expect(isSafeMediaUrl("https://x.supabase.co/a.jpg")).toBe(true);
    expect(isSafeMediaUrl("data:image/jpeg;base64,AAAA")).toBe(true);
    expect(isSafeMediaUrl("")).toBe(true);
    expect(isSafeMediaUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeMediaUrl("data:text/html;base64,PHNjcmlwdD4=")).toBe(false);
  });
});

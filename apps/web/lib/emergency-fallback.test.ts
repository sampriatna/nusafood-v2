import { afterEach, describe, expect, it } from "vitest"
import {
  buildV1FallbackUrl,
  emergencyFallbackEnabled,
  isStaffSurfacePath,
} from "./emergency-fallback"

describe("emergency fallback", () => {
  afterEach(() => {
    delete process.env.EMERGENCY_FALLBACK_V1
    delete process.env.V1_APP_URL
  })

  it("detects staff surfaces", () => {
    expect(isStaffSurfacePath("/report/TASK-1")).toBe(true)
    expect(isStaffSurfacePath("/checklist/CHK-1")).toBe(true)
    expect(isStaffSurfacePath("/r/budi")).toBe(true)
    expect(isStaffSurfacePath("/api/tasks/TASK-1/public")).toBe(true)
    expect(isStaffSurfacePath("/api/staff-reports/by-token/abc")).toBe(true)
    expect(isStaffSurfacePath("/api/staff-reports/submit")).toBe(true)
    expect(isStaffSurfacePath("/dashboard")).toBe(false)
  })

  it("builds v1 redirect with token query", () => {
    process.env.V1_APP_URL = "https://v1.example.com/"
    expect(buildV1FallbackUrl("/report/TASK-1", "?token=abc")).toBe(
      "https://v1.example.com/report/TASK-1?token=abc"
    )
  })

  it("returns null without V1_APP_URL", () => {
    expect(buildV1FallbackUrl("/report/TASK-1", "?token=abc")).toBeNull()
  })

  it("reads EMERGENCY_FALLBACK_V1 flag", () => {
    expect(emergencyFallbackEnabled()).toBe(false)
    process.env.EMERGENCY_FALLBACK_V1 = "true"
    expect(emergencyFallbackEnabled()).toBe(true)
  })
})

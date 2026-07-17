import { prisma } from "@nusafood/database"
import { ok } from "@/lib/api/response"
import { requireAuth } from "@/lib/require-auth"
import { emergencyFallbackEnabled, getV1AppUrl } from "@/lib/emergency-fallback"
import { checkGasFallback } from "@/lib/services/gas-adapter.service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Check = {
  id: string
  ok: boolean
  detail: string
}

export async function GET() {
  const auth = await requireAuth(["ADMIN"])
  if (!auth.ok) return auth.response

  const checks: Check[] = []

  try {
    await prisma.$queryRaw`SELECT 1`
    checks.push({ id: "database", ok: true, detail: "PostgreSQL reachable" })
  } catch (error) {
    checks.push({
      id: "database",
      ok: false,
      detail: error instanceof Error ? error.message : "DB error",
    })
  }

  const sessionSecret = process.env.SESSION_SECRET
  checks.push({
    id: "session_secret",
    ok: Boolean(sessionSecret && !sessionSecret.includes("generate-random")),
    detail: sessionSecret ? "SESSION_SECRET set" : "SESSION_SECRET missing",
  })

  checks.push({
    id: "auth_required",
    ok: process.env.AUTH_REQUIRED !== "false",
    detail: `AUTH_REQUIRED=${process.env.AUTH_REQUIRED ?? "unset (default on)"}`,
  })

  const userCount = await prisma.userAccount.count().catch(() => -1)
  checks.push({
    id: "users_seeded",
    ok: userCount > 0,
    detail: userCount >= 0 ? `${userCount} user_accounts` : "count failed",
  })

  const v1Url = getV1AppUrl()
  checks.push({
    id: "v1_app_url",
    ok: Boolean(v1Url),
    detail: v1Url ? v1Url : "V1_APP_URL belum diisi (wajib sebelum cutover)",
  })

  checks.push({
    id: "emergency_fallback_default_off",
    ok: !emergencyFallbackEnabled(),
    detail: emergencyFallbackEnabled()
      ? "EMERGENCY_FALLBACK_V1=true (mode darurat aktif)"
      : "EMERGENCY_FALLBACK_V1 off (normal)",
  })

  checks.push({
    id: "dual_write",
    ok: true,
    detail: `DUAL_WRITE_ENABLED=${process.env.DUAL_WRITE_ENABLED ?? "false"} PRIMARY=${process.env.DUAL_WRITE_PRIMARY ?? "gas"}`,
  })

  const gas = await checkGasFallback()
  checks.push({
    id: "gas_fallback",
    ok: gas === "ok" || gas === "disabled",
    detail: `GAS health=${gas}`,
  })

  const failed = checks.filter((c) => !c.ok).map((c) => c.id)
  const ready = failed.length === 0

  return ok({
    ready,
    checks,
    failed,
    checked_at: new Date().toISOString(),
  })
}

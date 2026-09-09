import { prisma } from "@nusafood/database"
import { ok } from "@/lib/api/response"
import { requireAuth } from "@/lib/require-auth"
import { emergencyFallbackEnabled, getV1AppUrl } from "@/lib/emergency-fallback"
import { checkGasFallback } from "@/lib/services/gas-adapter.service"
import { checkStorageHealth } from "@/lib/services/storage.service"
import { verifyPassword } from "@/lib/users.service"

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

  const storage = await checkStorageHealth()
  checks.push({
    id: "storage",
    ok: storage === "ok",
    detail: `Supabase Storage=${storage}`,
  })

  const [activeStaffCount, activeLeaderStaff, activeLeaderAccounts] =
    await Promise.all([
      prisma.staff.count({ where: { status: "ACTIVE" } }).catch(() => -1),
      prisma.staff
        .findMany({
          where: { status: "ACTIVE", role: "LEADER" },
          select: { staffId: true },
        })
        .catch(() => []),
      prisma.userAccount
        .findMany({
          where: {
            role: "LEADER",
            loginEnabled: true,
            staff: { is: { status: "ACTIVE", outlet: { is: { isActive: true } } } },
          },
          select: { staffId: true },
        })
        .catch(() => []),
    ])

  checks.push({
    id: "active_staff_migrated",
    ok: activeStaffCount > 0,
    detail:
      activeStaffCount >= 0
        ? `${activeStaffCount} staff aktif`
        : "gagal menghitung staff aktif",
  })

  const leaderAccountIds = new Set(
    activeLeaderAccounts.map((account) => account.staffId).filter(Boolean),
  )
  const missingLeaderAccounts = activeLeaderStaff.filter(
    (staff) => !leaderAccountIds.has(staff.staffId),
  ).length
  checks.push({
    id: "leader_accounts_linked",
    ok: activeLeaderStaff.length > 0 && missingLeaderAccounts === 0,
    detail: `${activeLeaderAccounts.length}/${activeLeaderStaff.length} leader aktif punya akun + outlet`,
  })

  const passwordRows = await prisma.userAccount
    .findMany({
      where: { loginEnabled: true },
      select: { passwordHash: true },
    })
    .catch(() => [])
  const defaultPasswordMatches = await Promise.all(
    passwordRows.map(async (user) =>
        (await verifyPassword("admin123", user.passwordHash)) ||
        (await verifyPassword("leader123", user.passwordHash)),
    ),
  )
  const defaultPasswordCount = defaultPasswordMatches.filter(
    Boolean,
  ).length
  checks.push({
    id: "default_passwords_removed",
    ok: defaultPasswordCount === 0,
    detail:
      defaultPasswordCount === 0
        ? "tidak ada akun aktif memakai password demo"
        : `${defaultPasswordCount} akun aktif masih memakai password demo`,
  })

  const schemaRows = await prisma
    .$queryRaw<
      Array<{ leader_monitor: string | null; staff_jobs: string | null }>
    >`SELECT
      to_regclass('public.leader_monitor_templates')::text AS leader_monitor,
      to_regclass('public.staff_job_profiles')::text AS staff_jobs`
    .catch(() => [])
  const latestSchemaReady = Boolean(
    schemaRows[0]?.leader_monitor && schemaRows[0]?.staff_jobs,
  )
  checks.push({
    id: "latest_schema",
    ok: latestSchemaReady,
    detail:
      latestSchemaReady
        ? "Leader Monitoring + multi-jabatan tersedia"
        : "migration schema terbaru belum lengkap",
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

  const leaderTemplateCount = await prisma.leaderMonitorTemplate
    .count()
    .catch((error) => {
      checks.push({
        id: "leader_monitor_schema",
        ok: false,
        detail:
          error instanceof Error
            ? `leader_monitor tables: ${error.message}`
            : "leader_monitor tables missing — jalankan pnpm db:migrate:deploy",
      })
      return -1
    })

  if (leaderTemplateCount >= 0) {
    checks.push({
      id: "leader_monitor_schema",
      ok: true,
      detail: `leader_monitor_templates OK (${leaderTemplateCount} rows)`,
    })
  }

  const disciplinaryCount = await prisma.disciplinaryLetter
    .count()
    .catch((error) => {
      checks.push({
        id: "disciplinary_schema",
        ok: false,
        detail:
          error instanceof Error
            ? `disciplinary tables: ${error.message}`
            : "disciplinary tables missing — jalankan pnpm db:migrate:deploy",
      })
      return -1
    })

  if (disciplinaryCount >= 0) {
    checks.push({
      id: "disciplinary_schema",
      ok: true,
      detail: `disciplinary_letters OK (${disciplinaryCount} rows)`,
    })
  }

  const failed = checks.filter((c) => !c.ok).map((c) => c.id)
  const ready = failed.length === 0

  return ok({
    ready,
    checks,
    failed,
    checked_at: new Date().toISOString(),
  })
}

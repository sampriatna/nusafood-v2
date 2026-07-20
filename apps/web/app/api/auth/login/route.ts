import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  validateAdminPassword,
} from "@/lib/auth"
import { ok, fail } from "@/lib/api/response"
import { getSessionCapabilities } from "@/lib/permissions"
import {
  checkRateLimit,
  getClientIp,
  loginRateLimitConfig,
} from "@/lib/rate-limit"
import { writeRbacAuditLog } from "@/lib/rbac-audit"
import { logSyncOperation } from "@/lib/services/dual-write.service"
import {
  ensureBootstrapAdmin,
  findUserForLogin,
  touchLastLogin,
  verifyPassword,
} from "@/lib/users.service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const { limit, windowMs } = loginRateLimitConfig()
    const rate = checkRateLimit(`login:${ip}`, limit, windowMs)
    if (!rate.allowed) {
      await logSyncOperation({
        operation: "login_rate_limited",
        entityType: "auth",
        v2Status: "failed",
        v2Response: { ip, retry_after_sec: rate.retryAfterSec },
        errorMessage: "Terlalu banyak percobaan login",
      })
      return fail("Terlalu banyak percobaan login. Coba lagi nanti.", {
        code: "RATE_LIMITED",
        status: 429,
      })
    }

    const body = (await request.json()) as {
      username?: string
      password?: string
    }

    const username = String(body.username || "").trim().toLowerCase()
    const password = String(body.password || "")

    if (!password) {
      return fail("Password wajib diisi", { code: "PASSWORD_REQUIRED", status: 400 })
    }

    // Kompatibilitas v1: username kosong + ADMIN_PASSWORD
    if (!username) {
      if (!validateAdminPassword(password)) {
        return fail("Username/password salah", {
          code: "INVALID_CREDENTIALS",
          status: 401,
        })
      }

      const token = await createSessionToken({
        userId: "env-admin",
        userName: "Owner",
        userRole: "ADMIN",
        username: "owner",
        isOwner: true,
      })
      const ownerSession = {
        isAdmin: true,
        isOwner: true,
        loginAt: Date.now(),
        expiresAt: Date.now() + 12 * 60 * 60 * 1000,
        userId: "env-admin",
        userName: "Owner",
        userRole: "ADMIN" as const,
        username: "owner",
      }
      await writeRbacAuditLog({
        session: ownerSession,
        action: "login",
        entityType: "auth",
        entityId: "env-admin",
        note: "Owner env login",
      })
      const caps = getSessionCapabilities(ownerSession)
      const response = ok({
        user_id: "env-admin",
        staff_id: null,
        name: "Owner",
        role: "ADMIN",
        app_role: caps.app_role,
        is_owner: true,
        outlet: null,
        capabilities: caps,
      })
      response.cookies.set(SESSION_COOKIE_NAME, token, cookieOptions(60 * 60 * 12))
      return response
    }

    await ensureBootstrapAdmin()

    const user = await findUserForLogin(username)
    if (!user || !user.loginEnabled) {
      return fail("Username/password salah", {
        code: "INVALID_CREDENTIALS",
        status: 401,
      })
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return fail("Username/password salah", {
        code: "INVALID_CREDENTIALS",
        status: 401,
      })
    }

    await touchLastLogin(user.id)

    const displayName = user.staff?.name || user.username
    const outlet = user.staff?.outlet
    const token = await createSessionToken({
      userId: user.userId,
      userName: displayName,
      userRole: user.role,
      staffId: user.staffId ?? undefined,
      userOutlet: outlet?.code,
      userOutletId: outlet?.id,
      username: user.username,
    })

    const sessionPreview = {
      isAdmin: ["ADMIN", "LEADER"].includes(user.role),
      isOwner: false as boolean,
      loginAt: Date.now(),
      expiresAt: Date.now() + 12 * 60 * 60 * 1000,
      userId: user.userId,
      userName: displayName,
      userRole: user.role,
      userOutlet: outlet?.code,
      userOutletId: outlet?.id,
      staffId: user.staffId ?? undefined,
      username: user.username,
    }
    // Recompute isOwner from token path (env OWNER_*)
    const { resolveIsOwner } = await import("@/lib/owner")
    sessionPreview.isOwner = resolveIsOwner({
      userId: user.userId,
      username: user.username,
    })
    sessionPreview.isAdmin =
      sessionPreview.isOwner || ["ADMIN", "LEADER"].includes(user.role)

    await writeRbacAuditLog({
      session: sessionPreview,
      action: "login",
      entityType: "auth",
      entityId: user.userId,
      outletId: outlet?.id,
      note: `Login ${user.username}`,
    })

    const caps = getSessionCapabilities(sessionPreview)
    const response = ok({
      user_id: user.userId,
      staff_id: user.staffId,
      name: displayName,
      role: user.role,
      app_role: caps.app_role,
      is_owner: caps.is_owner,
      outlet: outlet?.code ?? null,
      capabilities: caps,
    })
    response.cookies.set(SESSION_COOKIE_NAME, token, cookieOptions(60 * 60 * 12))
    return response
  } catch (error) {
    console.error("[POST /api/auth/login]", error)
    return fail(error instanceof Error ? error.message : "Login gagal", {
      code: "LOGIN_FAILED",
      status: 500,
    })
  }
}

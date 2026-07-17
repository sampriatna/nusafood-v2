import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  validateAdminPassword,
} from "@/lib/auth"
import { ok, fail } from "@/lib/api/response"
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
        userName: "Administrator",
        userRole: "ADMIN",
      })
      const response = ok({
        user_id: "env-admin",
        staff_id: null,
        name: "Administrator",
        role: "ADMIN",
        outlet: null,
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
    const token = await createSessionToken({
      userId: user.userId,
      userName: displayName,
      userRole: user.role,
      staffId: user.staffId ?? undefined,
      userOutlet: undefined,
    })

    const response = ok({
      user_id: user.userId,
      staff_id: user.staffId,
      name: displayName,
      role: user.role,
      outlet: null,
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

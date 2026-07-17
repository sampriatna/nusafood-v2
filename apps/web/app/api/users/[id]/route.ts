import type { StaffRole } from "@nusafood/types"
import { ok, fail } from "@/lib/api/response"
import { requireAuth } from "@/lib/require-auth"
import { getUserById, updateUser } from "@/lib/users.service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ROLES: StaffRole[] = ["ADMIN", "LEADER", "STAFF"]

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["ADMIN", "LEADER"])
  if (!auth.ok) return auth.response

  const { id } = await context.params
  const user = await getUserById(id)
  if (!user) {
    return fail("User tidak ditemukan", { code: "NOT_FOUND", status: 404 })
  }
  return ok(user)
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(["ADMIN"])
  if (!auth.ok) return auth.response

  try {
    const { id } = await context.params
    const body = (await request.json()) as {
      role?: StaffRole
      staff_id?: string | null
      staffId?: string | null
      login_enabled?: boolean
      loginEnabled?: boolean
      password?: string
    }

    if (body.role && !ROLES.includes(body.role)) {
      return fail("role tidak valid", { code: "INVALID_ROLE", status: 400 })
    }

    const user = await updateUser(id, {
      role: body.role,
      staffId:
        body.staff_id !== undefined
          ? body.staff_id
          : body.staffId !== undefined
            ? body.staffId
            : undefined,
      loginEnabled: body.login_enabled ?? body.loginEnabled,
      password: body.password,
    })
    if (!user) {
      return fail("User tidak ditemukan", { code: "NOT_FOUND", status: 404 })
    }
    return ok(user)
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Gagal update user", {
      code: "USER_UPDATE_FAILED",
      status: 400,
    })
  }
}

import type { StaffRole } from "@nusafood/types"
import { ok, fail } from "@/lib/api/response"
import { requireUserManagement } from "@/lib/require-auth"
import { writeRbacAuditLog } from "@/lib/rbac-audit"
import { getUserById, updateUser, deleteUser } from "@/lib/users.service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ROLES: StaffRole[] = ["ADMIN", "LEADER", "STAFF"]

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUserManagement()
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
  const auth = await requireUserManagement()
  if (!auth.ok) return auth.response

  try {
    const { id } = await context.params
    const existing = await getUserById(id)
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

    await writeRbacAuditLog({
      session: auth.session,
      action: body.role ? "change_role" : "update_user",
      entityType: "user_account",
      entityId: user.userId,
      oldValue: existing
        ? { role: existing.role, login_enabled: existing.loginEnabled }
        : undefined,
      newValue: {
        role: user.role,
        login_enabled: user.loginEnabled,
      },
    })

    return ok(user)
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Gagal update user", {
      code: "USER_UPDATE_FAILED",
      status: 400,
    })
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUserManagement()
  if (!auth.ok) return auth.response

  const { id } = await context.params
  const existing = await getUserById(id)
  const deleted = await deleteUser(id)
  if (!deleted) {
    return fail("User tidak ditemukan", { code: "NOT_FOUND", status: 404 })
  }

  await writeRbacAuditLog({
    session: auth.session,
    action: "delete_user",
    entityType: "user_account",
    entityId: id,
    oldValue: existing
      ? { username: existing.username, role: existing.role }
      : undefined,
  })

  return ok({ deleted: true })
}

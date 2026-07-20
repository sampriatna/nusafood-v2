import type { StaffRole } from "@nusafood/types"
import { ok, fail } from "@/lib/api/response"
import { isOwner } from "@/lib/permissions"
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
      is_owner?: boolean
      isOwner?: boolean
      can_approve_sp?: boolean
      canApproveSp?: boolean
    }

    if (body.role && !ROLES.includes(body.role)) {
      return fail("role tidak valid", { code: "INVALID_ROLE", status: 400 })
    }

    const wantOwner =
      body.is_owner !== undefined
        ? Boolean(body.is_owner)
        : body.isOwner !== undefined
          ? Boolean(body.isOwner)
          : undefined

    if (wantOwner !== undefined && !isOwner(auth.session)) {
      return fail("Hanya Owner yang boleh mengubah flag Owner.", {
        code: "OWNER_REQUIRED",
        status: 403,
      })
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
      isOwner: wantOwner,
      canApproveSp: body.can_approve_sp ?? body.canApproveSp,
    })
    if (!user) {
      return fail("User tidak ditemukan", { code: "NOT_FOUND", status: 404 })
    }

    await writeRbacAuditLog({
      session: auth.session,
      action:
        wantOwner !== undefined || body.role
          ? "change_role"
          : "update_user",
      entityType: "user_account",
      entityId: user.userId,
      oldValue: existing
        ? {
            role: existing.role,
            is_owner: existing.isOwner,
            can_approve_sp: existing.canApproveSp,
            login_enabled: existing.loginEnabled,
          }
        : undefined,
      newValue: {
        role: user.role,
        is_owner: user.isOwner,
        can_approve_sp: user.canApproveSp,
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
  if (existing?.isOwner && !isOwner(auth.session)) {
    return fail("Hanya Owner yang boleh menghapus akun Owner.", {
      code: "OWNER_REQUIRED",
      status: 403,
    })
  }

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
      ? {
          username: existing.username,
          role: existing.role,
          is_owner: existing.isOwner,
        }
      : undefined,
  })

  return ok({ deleted: true })
}

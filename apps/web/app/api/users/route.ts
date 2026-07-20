import type { StaffRole } from "@nusafood/types"
import { ok, fail } from "@/lib/api/response"
import { requireUserManagement } from "@/lib/require-auth"
import { writeRbacAuditLog } from "@/lib/rbac-audit"
import { createUser, listUsers } from "@/lib/users.service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ROLES: StaffRole[] = ["ADMIN", "LEADER", "STAFF"]

export async function GET() {
  const auth = await requireUserManagement()
  if (!auth.ok) return auth.response

  const data = await listUsers()
  return ok(data)
}

export async function POST(request: Request) {
  const auth = await requireUserManagement()
  if (!auth.ok) return auth.response

  try {
    const body = (await request.json()) as {
      username?: string
      password?: string
      role?: StaffRole
      staff_id?: string | null
      staffId?: string | null
      login_enabled?: boolean
      loginEnabled?: boolean
    }

    if (!body.username || !body.password || !body.role) {
      return fail("username, password, role wajib", {
        code: "VALIDATION_ERROR",
        status: 400,
      })
    }
    if (!ROLES.includes(body.role)) {
      return fail("role tidak valid", { code: "INVALID_ROLE", status: 400 })
    }

    const user = await createUser({
      username: body.username,
      password: body.password,
      role: body.role,
      staffId: body.staff_id ?? body.staffId,
      loginEnabled: body.login_enabled ?? body.loginEnabled,
    })

    await writeRbacAuditLog({
      session: auth.session,
      action: "create_user",
      entityType: "user_account",
      entityId: user.userId,
      newValue: { username: user.username, role: user.role },
    })

    return ok(user, undefined, { status: 201 })
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Gagal membuat user", {
      code: "USER_CREATE_FAILED",
      status: 400,
    })
  }
}

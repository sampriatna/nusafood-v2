import { getSession } from "@/lib/auth"
import { ok, fail } from "@/lib/api/response"
import { getUserById } from "@/lib/users.service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return fail("Unauthorized", { code: "UNAUTHORIZED", status: 401 })
  }

  if (session.userId === "env-admin") {
    return ok({
      authenticated: true,
      user: {
        user_id: "env-admin",
        username: "admin",
        name: session.userName || "Administrator",
        role: session.userRole,
        staff_id: null,
        outlet: session.userOutlet ?? null,
      },
    })
  }

  const user = await getUserById(session.userId)
  if (!user || !user.loginEnabled) {
    return fail("Unauthorized", { code: "UNAUTHORIZED", status: 401 })
  }

  return ok({
    authenticated: true,
    user: {
      user_id: user.userId,
      username: user.username,
      name: user.displayName,
      role: user.role,
      staff_id: user.staffId,
      outlet: session.userOutlet ?? null,
    },
  })
}

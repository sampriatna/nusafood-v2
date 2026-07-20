import { getSession } from "@/lib/auth"
import { ok, fail } from "@/lib/api/response"
import { getSessionCapabilities } from "@/lib/permissions"
import { getUserById } from "@/lib/users.service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return fail("Unauthorized", { code: "UNAUTHORIZED", status: 401 })
  }

  const caps = getSessionCapabilities(session)

  if (session.userId === "env-admin") {
    return ok({
      authenticated: true,
      user: {
        user_id: "env-admin",
        username: session.username || "owner",
        name: session.userName || "Owner",
        role: session.userRole,
        app_role: caps.app_role,
        is_owner: true,
        staff_id: null,
        outlet: session.userOutlet ?? null,
      },
      capabilities: caps,
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
      app_role: caps.app_role,
      is_owner: caps.is_owner,
      staff_id: user.staffId,
      outlet: session.userOutlet ?? null,
    },
    capabilities: caps,
  })
}

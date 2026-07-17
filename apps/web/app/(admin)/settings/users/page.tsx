import Link from "next/link"
import { authRequired, getSession } from "@/lib/auth"
import { listUsers } from "@/lib/users.service"
import { UsersManager } from "./users-manager"

export const dynamic = "force-dynamic"

export default async function UsersSettingsPage() {
  const [users, session] = await Promise.all([listUsers(), getSession()])
  const canManage =
    !authRequired() || session?.userRole === "ADMIN" || session?.userId === "env-admin"

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-2">
          <Link
            href="/settings"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Settings
          </Link>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manajemen akun login multi-user (RBAC: ADMIN / LEADER / STAFF).
          </p>
        </div>
        <UsersManager users={users} canManage={canManage} />
      </div>
    </main>
  )
}

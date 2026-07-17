import { AdminPage } from "@/components/admin-page";
import { authRequired, getSession } from "@/lib/auth";
import { listStaff } from "@/lib/services/staff.service";
import { listUsers } from "@/lib/users.service";
import { UsersManager } from "./users-manager";

export const dynamic = "force-dynamic";

export default async function UsersSettingsPage() {
  const [users, staff, session] = await Promise.all([
    listUsers(),
    listStaff({ status: "ACTIVE" }),
    getSession(),
  ]);

  const canManage =
    !authRequired() ||
    session?.userRole === "ADMIN" ||
    session?.userId === "env-admin";

  return (
    <AdminPage title="Manajemen User" backHref="/settings">
      <p className="text-sm text-muted-foreground">
        RBAC: ADMIN / LEADER / STAFF · {users.length} akun
      </p>
      <UsersManager users={users} staff={staff} canManage={canManage} />
    </AdminPage>
  );
}

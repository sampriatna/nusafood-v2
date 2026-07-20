import { redirect } from "next/navigation";
import { AdminPage } from "@/components/admin-page";
import { authRequired, getSession } from "@/lib/auth";
import { canManageUsers, getAppRole } from "@/lib/permissions";
import { listStaff } from "@/lib/services/staff.service";
import { listUsers } from "@/lib/users.service";
import { UsersManager } from "./users-manager";

export const dynamic = "force-dynamic";

export default async function UsersSettingsPage() {
  const session = await getSession();
  const canManage = !authRequired() || canManageUsers(session);
  if (authRequired() && !canManage) {
    redirect("/settings?error=forbidden");
  }

  const [users, staff] = await Promise.all([
    listUsers(),
    listStaff({ status: "ACTIVE" }),
  ]);

  return (
    <AdminPage title="Manajemen User" backHref="/settings">
      <p className="text-sm text-muted-foreground">
        RBAC: OWNER / ADMIN / LEADER / STAFF · role kamu: {getAppRole(session)} ·{" "}
        {users.length} akun
      </p>
      <UsersManager users={users} staff={staff} canManage={canManage} />
    </AdminPage>
  );
}

import { AdminPage } from "@/components/admin-page";
import { MasterDataSyncButton } from "@/components/master-data-sync-button";
import { authRequired, getSession } from "@/lib/auth";
import {
  listAreas,
  listOutlets,
} from "@/lib/services/master-data.service";
import { listStaff } from "@/lib/services/staff.service";
import { StaffManager } from "./staff-manager";

export const dynamic = "force-dynamic";

export default async function StaffSettingsPage() {
  const [staff, outlets, areas, session] = await Promise.all([
    listStaff(),
    listOutlets(),
    listAreas(),
    getSession(),
  ]);

  const canManage =
    !authRequired() ||
    session?.userRole === "ADMIN" ||
    session?.userId === "env-admin";

  return (
    <AdminPage title="Master Staff" backHref="/settings">
      <MasterDataSyncButton canManage={canManage} />
      <p className="text-sm text-muted-foreground">
        {staff.length} staf · {staff.filter((s) => s.status === "ACTIVE").length}{" "}
        aktif
      </p>
      <StaffManager
        staff={staff}
        outlets={outlets.map((o) => ({
          value: o.code,
          label: o.name || o.code,
        }))}
        areas={areas.map((a) => ({
          value: a.name,
          label: a.name,
          outlet: a.outlet,
        }))}
        canManage={canManage}
      />
    </AdminPage>
  );
}

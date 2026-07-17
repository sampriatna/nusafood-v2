import { AdminPage } from "@/components/admin-page";
import { authRequired, getSession } from "@/lib/auth";
import { listAreas, listOutlets } from "@/lib/services/master-data.service";
import { AreasManager } from "./areas-manager";

export const dynamic = "force-dynamic";

export default async function AreasSettingsPage() {
  const [areas, outlets, session] = await Promise.all([
    listAreas(),
    listOutlets(),
    getSession(),
  ]);

  const canManage =
    !authRequired() ||
    session?.userRole === "ADMIN" ||
    session?.userId === "env-admin";

  return (
    <AdminPage title="Master Area" backHref="/settings">
      <p className="text-sm text-muted-foreground">
        {areas.length} area terdaftar
      </p>
      <AreasManager
        areas={areas}
        outlets={outlets.map((o) => ({
          value: o.code,
          label: o.name || o.code,
        }))}
        canManage={canManage}
      />
    </AdminPage>
  );
}

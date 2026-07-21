import { AdminPage } from "@/components/admin-page";
import { DailyActivitySeedButton } from "@/components/daily-activity-seed-button";
import { authRequired, getSession } from "@/lib/auth";
import { ReportTemplatesManager } from "./report-templates-manager";

export const dynamic = "force-dynamic";

export default async function ReportTemplatesPage() {
  const session = await getSession();
  const canManage =
    !authRequired() ||
    session?.userRole === "ADMIN" ||
    session?.userId === "env-admin";

  return (
    <AdminPage title="Template Kegiatan" backHref="/settings/daily-activity">
      <div>
        <h2 className="font-semibold">SOP Kegiatan Standar</h2>
        <p className="text-sm text-muted-foreground">
          Checklist + standar hasil + foto - bukan laporan bebas.
        </p>
      </div>
      <DailyActivitySeedButton canManage={canManage} compact />
      <ReportTemplatesManager />
    </AdminPage>
  );
}

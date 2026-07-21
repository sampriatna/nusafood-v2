import { AdminPage } from "@/components/admin-page";
import { authRequired, getSession } from "@/lib/auth";
import { listReportTemplatesForAdmin } from "@/lib/services/daily-activity.service";
import { ReportTemplatesManager } from "./report-templates-manager";

export const dynamic = "force-dynamic";

export default async function ReportTemplatesPage() {
  const session = await getSession();
  const canManage =
    !authRequired() ||
    session?.userRole === "ADMIN" ||
    session?.userId === "env-admin";

  const initialTemplates = await listReportTemplatesForAdmin();

  return (
    <AdminPage title="Template Kegiatan" backHref="/settings/daily-activity" maxWidth="3xl">
      <div className="space-y-1">
        <h2 className="font-semibold">SOP Kegiatan Standar</h2>
        <p className="text-sm text-muted-foreground">
          {initialTemplates.length} template · checklist + standar hasil + foto
        </p>
      </div>
      <ReportTemplatesManager
        canManage={canManage}
        initialTemplates={initialTemplates}
      />
    </AdminPage>
  );
}

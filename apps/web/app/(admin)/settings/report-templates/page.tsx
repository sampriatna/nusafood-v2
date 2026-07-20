import { AdminPage } from "@/components/admin-page";
import { ReportTemplatesManager } from "./report-templates-manager";

export const dynamic = "force-dynamic";

export default function ReportTemplatesPage() {
  return (
    <AdminPage title="Template Kegiatan" backHref="/settings/daily-activity">
      <div>
        <h2 className="font-semibold">SOP Kegiatan Standar</h2>
        <p className="text-sm text-muted-foreground">
          Checklist + standar hasil + foto - bukan laporan bebas.
        </p>
      </div>
      <ReportTemplatesManager />
    </AdminPage>
  );
}

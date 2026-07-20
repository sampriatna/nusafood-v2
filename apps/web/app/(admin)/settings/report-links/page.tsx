import { AdminPage } from "@/components/admin-page";
import { ReportLinksManager } from "./report-links-manager";

export const dynamic = "force-dynamic";

export default function ReportLinksPage() {
  return (
    <AdminPage title="Link Report Staff" backHref="/settings/daily-activity">
      <ReportLinksManager />
    </AdminPage>
  );
}

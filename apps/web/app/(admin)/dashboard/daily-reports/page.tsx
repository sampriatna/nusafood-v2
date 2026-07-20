import { AdminPage } from "@/components/admin-page";
import { DailyReportsDashboardClient } from "./daily-reports-dashboard-client";

export const dynamic = "force-dynamic";

export default function DailyReportsDashboardPage() {
  return (
    <AdminPage title="Daily Report" backHref="/dashboard" maxWidth="3xl">
      <DailyReportsDashboardClient />
    </AdminPage>
  );
}

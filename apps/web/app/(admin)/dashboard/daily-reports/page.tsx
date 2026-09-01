import Link from "next/link";
import { BriefcaseBusiness } from "lucide-react";
import { AdminPage } from "@/components/admin-page";
import { Button } from "@/components/ui/button";
import { DailyReportsDashboardClient } from "./daily-reports-dashboard-client";

export const dynamic = "force-dynamic";

export default function DailyReportsDashboardPage() {
  return (
    <AdminPage title="Daily Report" backHref="/dashboard" maxWidth="3xl">
      <div className="mb-4">
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/dashboard/staff-duty">
            <BriefcaseBusiness className="mr-2 size-4" />
            Atur Posisi Kerja Hari Ini
          </Link>
        </Button>
      </div>
      <DailyReportsDashboardClient />
    </AdminPage>
  );
}

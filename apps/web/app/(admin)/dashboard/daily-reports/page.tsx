import Link from "next/link";
import { BriefcaseBusiness } from "lucide-react";
import { AdminPage } from "@/components/admin-page";
import { Button } from "@/components/ui/button";
import { DailyReportsDashboardClient } from "./daily-reports-dashboard-client";

export const dynamic = "force-dynamic";

export default function DailyReportsDashboardPage() {
  return (
    <AdminPage
      title="Laporan Harian"
      description="Siapa sudah dan belum mengisi kegiatan SOP harian, lengkap dengan kendala dan validasi leader."
      backHref="/dashboard"
      maxWidth="3xl"
    >
      <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
        <Link href="/dashboard/staff-duty">
          <BriefcaseBusiness className="mr-2 size-4" />
          Atur Posisi Kerja Hari Ini
        </Link>
      </Button>
      <DailyReportsDashboardClient />
    </AdminPage>
  );
}

import { AdminPage } from "@/components/admin-page";
import { DailyActivityAutoSeedBanner } from "@/components/daily-activity-auto-seed-banner";
import { DailyActivitySeedButton } from "@/components/daily-activity-seed-button";
import { authRequired, getSession } from "@/lib/auth";
import { ensureDailyActivityTemplatesSeeded } from "@/lib/services/daily-activity-seed.service";
import { ReportTemplatesManager } from "./report-templates-manager";

export const dynamic = "force-dynamic";

export default async function ReportTemplatesPage() {
  const session = await getSession();
  const canManage =
    !authRequired() ||
    session?.userRole === "ADMIN" ||
    session?.userId === "env-admin";

  let autoSeedCount: number | null = null;
  if (canManage) {
    const ensured = await ensureDailyActivityTemplatesSeeded();
    if (ensured.seeded && ensured.result) {
      autoSeedCount = ensured.result.templates;
    }
  }

  return (
    <AdminPage title="Template Kegiatan" backHref="/settings/daily-activity">
      {autoSeedCount != null ? (
        <DailyActivityAutoSeedBanner templateCount={autoSeedCount} />
      ) : null}
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

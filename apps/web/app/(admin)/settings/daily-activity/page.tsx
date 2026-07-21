import { ClipboardList, FileText, Info, Layers, Link2 } from "lucide-react";
import { AdminPage } from "@/components/admin-page";
import { DailyActivityAutoSeedBanner } from "@/components/daily-activity-auto-seed-banner";
import { DailyActivitySeedButton } from "@/components/daily-activity-seed-button";
import { DailyActivityTemplateCatalog } from "@/components/daily-activity-template-catalog";
import { StaffPositionNormalizeButton } from "@/components/staff-position-normalize-button";
import { SettingsLinkCard } from "@/components/settings-link-card";
import { Card, CardContent } from "@/components/ui/card";
import { authRequired, getSession } from "@/lib/auth";
import { ensureDailyActivityTemplatesSeeded } from "@/lib/services/daily-activity-seed.service";

export const dynamic = "force-dynamic";

export default async function DailyActivitySettingsPage() {
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
    <AdminPage title="Daily Activity SOP" backHref="/settings">
      {autoSeedCount != null ? (
        <DailyActivityAutoSeedBanner templateCount={autoSeedCount} />
      ) : null}
      <DailyActivitySeedButton canManage={canManage} />
      <StaffPositionNormalizeButton canManage={canManage} />
      <DailyActivityTemplateCatalog />

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="flex gap-3 p-4">
          <Info className="mt-0.5 size-5 shrink-0 text-blue-700" />
          <div className="space-y-1 text-sm text-blue-900">
            <p className="font-semibold">
              Lapisan tambahan - Task lama tetap jalan
            </p>
            <p>
              <strong>Task lama:</strong> pekerjaan dari admin/leader (deadline,
              revisi, approval, foto before-after, WA).
            </p>
            <p>
              <strong>Daily Activity:</strong> kegiatan standar harian per SDM
              via link pribadi - checklist + foto + status. Tidak perlu dikirim
              WA tiap hari.
            </p>
          </div>
        </CardContent>
      </Card>

      <SettingsLinkCard
        href="/settings/report-templates"
        icon={FileText}
        title="Edit Template Kegiatan"
        description="Nama, standar hasil, checklist, foto wajib, jam target, posisi, outlet"
      />
      <SettingsLinkCard
        href="/settings/report-links"
        icon={Link2}
        title="Link Permanen Staff"
        description="Generate, salin, atau nonaktifkan /r/[token] per SDM"
      />
      <SettingsLinkCard
        href="/dashboard/daily-reports"
        icon={ClipboardList}
        title="Dashboard Audit"
        description="% checklist, status kondisi, belum submit, foto & catatan"
      />

      <Card>
        <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Layers className="size-4" />
            Cara pakai cepat
          </div>
          <ol className="list-inside list-decimal space-y-1">
            <li>Buka halaman ini sekali (template auto-import jika DB kosong)</li>
            <li>Normalisasi Jabatan Staff + generate link /r/nama</li>
            <li>Staff buka link tiap hari — kegiatan muncul sesuai posisi</li>
            <li>Pantau di Dashboard Audit</li>
          </ol>
        </CardContent>
      </Card>
    </AdminPage>
  );
}

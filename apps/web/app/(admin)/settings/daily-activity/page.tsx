import { ClipboardList, FileText, Info, Layers, Link2 } from "lucide-react";
import { AdminPage } from "@/components/admin-page";
import { DailyActivitySeedButton } from "@/components/daily-activity-seed-button";
import { SettingsLinkCard } from "@/components/settings-link-card";
import { Card, CardContent } from "@/components/ui/card";
import { authRequired, getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DailyActivitySettingsPage() {
  const session = await getSession();
  const canManage =
    !authRequired() ||
    session?.userRole === "ADMIN" ||
    session?.userId === "env-admin";

  return (
    <AdminPage title="Daily Activity SOP" backHref="/settings">
      <DailyActivitySeedButton canManage={canManage} />

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
            <li>Klik Seed Template Kegiatan (sekali setelah deploy)</li>
            <li>Edit / tambah template kegiatan + checklist jika perlu</li>
            <li>Generate link untuk tiap staff aktif</li>
            <li>Bagikan link satu kali - staff pakai tiap hari</li>
            <li>Pantau di Dashboard Audit</li>
          </ol>
        </CardContent>
      </Card>
    </AdminPage>
  );
}

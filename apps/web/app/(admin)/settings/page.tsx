import {
  Building2,
  CheckCircle2,
  Database,
  History,
  Info,
  Layers,
  Repeat,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AdminPage } from "@/components/admin-page";
import { SettingsLinkCard } from "@/components/settings-link-card";
import { SettingsLogoutCard } from "@/components/settings-logout-card";
import { Card } from "@/components/ui/card";
import { listRecurringTemplates } from "@/lib/services/recurring.service";
import { listStaff } from "@/lib/services/staff.service";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [recurring, staff] = await Promise.all([
    listRecurringTemplates(),
    listStaff({ status: "ACTIVE" }),
  ]);

  const staffPreview = staff
    .slice(0, 3)
    .map((s) => s.name)
    .join(", ");

  return (
    <AdminPage title="Pengaturan" backHref="/dashboard">
      <Card className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Database className="size-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">PostgreSQL v2</h3>
            <p className="text-sm text-muted-foreground">
              Data operasional tersimpan di Supabase. Template checklist sudah
              dimigrasi dari v1.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3">
          <CheckCircle2 className="size-5 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-800">
            Terhubung ke database PostgreSQL
          </span>
        </div>
        <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-blue-600" />
          <p className="text-blue-800">
            Data tugas & checklist disimpan di Supabase. Sync dari v1 via{" "}
            <code className="text-xs">pnpm sync:from-gas</code>.
          </p>
        </div>
      </Card>

      <SettingsLinkCard
        href="/settings/recurring-tasks"
        icon={Repeat}
        title="Template Tugas Berulang"
        description="Kelola jadwal, PIC, dan checklist harian"
        meta={`${recurring.length} template · ${recurring.filter((t) => t.active_status).length} aktif`}
      />
      <SettingsLinkCard
        href="/settings/staff"
        icon={Users}
        title="Master Staff"
        description="Kelola staf operasional per outlet — tambah, edit, sync v1"
        meta={
          staffPreview
            ? `${staff.length} aktif · ${staffPreview}${staff.length > 3 ? "…" : ""}`
            : `${staff.length} staf`
        }
      />
      <SettingsLinkCard
        href="/settings/areas"
        icon={Building2}
        title="Master Area"
        description="Area kerja per outlet (Dapur, Bar, …)"
      />
      <SettingsLinkCard
        href="/settings/categories"
        icon={Layers}
        title="Master Kategori"
        description="Kategori tugas (Cleaning, Kitchen, …)"
      />
      <SettingsLinkCard
        href="/settings/users"
        icon={ShieldCheck}
        title="Manajemen User Login"
        description="Akun admin & leader"
      />
      <SettingsLinkCard
        href="/settings/sync-logs"
        icon={History}
        title="Sync Logs"
        description="Riwayat migrasi & sync dari v1"
      />

      <Card className="p-4">
        <p className="text-center text-xs text-muted-foreground">
          Nusa Food Task &amp; Report System v2
          <br />
          Data disimpan di PostgreSQL (Supabase)
        </p>
      </Card>

      <SettingsLogoutCard />
    </AdminPage>
  );
}

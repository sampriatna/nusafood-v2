import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Database,
  History,
  Layers,
  Repeat,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AdminPage } from "@/components/admin-page";
import { SettingsLinkCard } from "@/components/settings-link-card";
import { SettingsLogoutCard } from "@/components/settings-logout-card";
import { V1FullSyncButton } from "@/components/v1-full-sync-button";
import { authRequired, getSession } from "@/lib/auth";
import { listRecurringTemplates } from "@/lib/services/recurring.service";
import { listStaff } from "@/lib/services/staff.service";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [recurring, staff, session] = await Promise.all([
    listRecurringTemplates(),
    listStaff({ status: "ACTIVE" }),
    getSession(),
  ]);

  const canManage =
    !authRequired() ||
    session?.userRole === "ADMIN" ||
    session?.userId === "env-admin";

  const staffPreview = staff
    .slice(0, 3)
    .map((s) => s.name)
    .join(", ");

  return (
    <AdminPage title="Pengaturan" backHref="/dashboard">
      <SectionTitle>Operasional</SectionTitle>
      <SettingsLinkCard
        href="/settings/recurring-tasks"
        icon={Repeat}
        title="Tugas Berulang"
        description="Jadwal, PIC, dan checklist tugas rutin"
        meta={`${recurring.length} template · ${recurring.filter((t) => t.active_status).length} aktif`}
      />
      <SettingsLinkCard
        href="/settings/daily-activity"
        icon={ClipboardList}
        title="Kegiatan Harian (SOP)"
        description="Template kegiatan harian, link report staff, dan audit SOP"
      />

      <SectionTitle>Data master</SectionTitle>
      <SettingsLinkCard
        href="/settings/staff"
        icon={Users}
        title="Staff"
        description="Staff operasional per outlet"
        meta={
          staffPreview
            ? `${staff.length} aktif · ${staffPreview}${staff.length > 3 ? "…" : ""}`
            : `${staff.length} staff`
        }
      />
      <SettingsLinkCard
        href="/settings/areas"
        icon={Building2}
        title="Area"
        description="Area kerja per outlet (Dapur, Bar, …)"
      />
      <SettingsLinkCard
        href="/settings/categories"
        icon={Layers}
        title="Kategori Tugas"
        description="Jenis tugas (Cleaning, Stok, …)"
      />
      <SettingsLinkCard
        href="/settings/users"
        icon={ShieldCheck}
        title="Akun Login"
        description="Akun admin & leader"
      />

      <details className="group rounded-xl border bg-card">
        <summary className="flex cursor-pointer items-center gap-3 p-4">
          <Database className="size-5 text-muted-foreground" />
          <span className="flex-1">
            <span className="block font-semibold">Lanjutan</span>
            <span className="block text-sm text-muted-foreground">
              Sinkronisasi data dari sistem lama (v1) & status database
            </span>
          </span>
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 border-t p-4">
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3">
            <CheckCircle2 className="size-5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-800">
              Database terhubung
            </span>
          </div>
          <V1FullSyncButton canManage={canManage} />
          <SettingsLinkCard
            href="/settings/sync-logs"
            icon={History}
            title="Riwayat Sinkronisasi"
            description="Log migrasi & sync dari v1"
          />
        </div>
      </details>

      <SettingsLogoutCard />
      <p className="text-center text-xs text-muted-foreground">
        Nusa Food Task &amp; Report System v2
      </p>
    </AdminPage>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="px-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
  );
}

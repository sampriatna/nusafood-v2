import {
  Building2,
  CheckCircle2,
  ClipboardList,
  Database,
  FileWarning,
  History,
  Info,
  Layers,
  Repeat,
  ShieldCheck,
  Users,
} from "lucide-react";
import { redirect } from "next/navigation";
import { AdminPage } from "@/components/admin-page";
import { SettingsLinkCard } from "@/components/settings-link-card";
import { SettingsLogoutCard } from "@/components/settings-logout-card";
import { V1FullSyncButton } from "@/components/v1-full-sync-button";
import { Card } from "@/components/ui/card";
import { authRequired, getSession } from "@/lib/auth";
import {
  canManageSystemSettings,
  canManageUsers,
  getAppRole,
  isLeader,
} from "@/lib/permissions";
import { listRecurringTemplates } from "@/lib/services/recurring.service";
import { listStaff } from "@/lib/services/staff.service";
import { resolveListOutletFilter } from "@/lib/outlet-scope";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (authRequired() && !session) {
    redirect("/login");
  }

  const canManage = !authRequired() || canManageSystemSettings(session);
  const canUsers = !authRequired() || canManageUsers(session);
  const leaderOnly = Boolean(session && isLeader(session) && !canManage);
  const appRole = getAppRole(session);

  const outletFilter =
    session && leaderOnly
      ? resolveListOutletFilter(session, null)
      : undefined;

  let recurring: Awaited<ReturnType<typeof listRecurringTemplates>> = [];
  let staff: Awaited<ReturnType<typeof listStaff>> = [];
  try {
    recurring = await listRecurringTemplates(outletFilter);
  } catch {
    recurring = [];
  }
  try {
    staff = await listStaff({
      status: "ACTIVE",
      ...(outletFilter ? { outlet: outletFilter } : {}),
    });
  } catch {
    staff = [];
  }

  const staffPreview = staff
    .slice(0, 3)
    .map((s) => s.name)
    .join(", ");

  return (
    <AdminPage title="Pengaturan" backHref="/dashboard">
      {canManage ? <V1FullSyncButton canManage={canManage} /> : null}

      {canManage ? (
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
              Role aktif: <strong>{appRole}</strong>. Owner dan Admin punya akses
              settings sistem; Leader hanya outlet sendiri.
            </p>
          </div>
        </Card>
      ) : (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">
            Mode Leader ({session?.userOutlet || "outlet"}): pengaturan terbatas
            untuk operasional outlet kamu.
          </p>
        </Card>
      )}

      <SettingsLinkCard
        href="/teguran"
        icon={FileWarning}
        title="Teguran Center"
        description={
          leaderOnly
            ? "Draft ST/SP untuk staff outlet sendiri"
            : "Surat Teguran (ST) & Surat Peringatan (SP) operasional"
        }
      />
      <SettingsLinkCard
        href="/settings/daily-activity"
        icon={ClipboardList}
        title="Daily Activity SOP"
        description={
          leaderOnly
            ? "Lihat hasil & link audit outlet sendiri"
            : "Link report staff, template kegiatan harian, leader monitoring"
        }
      />
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
        description={
          leaderOnly
            ? "Lihat staff outlet sendiri"
            : "Kelola staf operasional per outlet — tambah, edit, sync v1"
        }
        meta={
          staffPreview
            ? `${staff.length} aktif · ${staffPreview}${staff.length > 3 ? "…" : ""}`
            : `${staff.length} staf`
        }
      />

      {canManage ? (
        <>
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
        </>
      ) : null}

      {canUsers ? (
        <SettingsLinkCard
          href="/settings/users"
          icon={ShieldCheck}
          title="Manajemen User Login"
          description="Akun owner/admin & leader — ubah role"
        />
      ) : null}

      {canManage ? (
        <SettingsLinkCard
          href="/settings/sync-logs"
          icon={History}
          title="Sync Logs"
          description="Riwayat migrasi & sync dari v1"
        />
      ) : null}

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

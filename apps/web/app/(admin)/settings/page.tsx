import Link from "next/link";
import { SettingsLinkCard } from "@/components/settings-link-card";
import { SettingsBackLink } from "@/components/settings-back-link";
import { listChecklistTemplates } from "@/lib/services/checklist.service";
import { listRecurringTemplates } from "@/lib/services/recurring.service";
import { listStaff } from "@/lib/services/staff.service";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [checklists, recurring, staff] = await Promise.all([
    listChecklistTemplates(),
    listRecurringTemplates(),
    listStaff({ status: "ACTIVE" }),
  ]);

  const staffPreview = staff
    .slice(0, 3)
    .map((s) => s.name)
    .join(", ");

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="space-y-2">
          <SettingsBackLink href="/dashboard" label="← Dashboard" />
          <h1 className="text-2xl font-semibold">Pengaturan</h1>
          <p className="text-sm text-muted-foreground">
            Master data & template tugas berulang
          </p>
        </div>

        <div className="space-y-3">
          <SettingsLinkCard
            href="/settings/recurring-tasks"
            title="Template Tugas Berulang"
            description="Kelola jadwal, PIC, dan checklist harian"
            meta={`${recurring.length} template · ${recurring.filter((t) => t.active_status).length} aktif`}
          />
          <SettingsLinkCard
            href="/settings/staff"
            title="Master Staff"
            description="Daftar staf operasional per outlet"
            meta={
              staffPreview
                ? `${staff.length} aktif · ${staffPreview}${staff.length > 3 ? "…" : ""}`
                : `${staff.length} staf`
            }
          />
          <SettingsLinkCard
            href="/settings/areas"
            title="Master Area"
            description="Area kerja per outlet"
          />
          <SettingsLinkCard
            href="/settings/categories"
            title="Master Kategori"
            description="Kategori tugas (Cleaning, Kitchen, …)"
          />
          <SettingsLinkCard
            href="/settings/users"
            title="Manajemen User Login"
            description="Akun admin & leader"
          />
          <SettingsLinkCard
            href="/settings/sync-logs"
            title="Sync Logs"
            description="Riwayat migrasi & sync dari v1"
          />
        </div>

        {checklists.length > 0 ? (
          <section className="space-y-2 rounded-lg border border-border p-4">
            <h2 className="text-sm font-medium">Checklist templates</h2>
            <ul className="divide-y divide-border text-sm">
              {checklists.slice(0, 5).map((t) => (
                <li key={t.template_id} className="py-2">
                  <Link
                    href={`/checklist-template/${t.template_id}`}
                    className="font-medium hover:underline"
                  >
                    {t.template_name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {t.items.length} item · {t.outlet}
                  </p>
                </li>
              ))}
            </ul>
            {checklists.length > 5 ? (
              <Link
                href="/settings/recurring-tasks"
                className="text-xs text-primary hover:underline"
              >
                Lihat semua via Tugas Berulang →
              </Link>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}

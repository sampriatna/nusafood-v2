import Link from "next/link";
import { listChecklistTemplates } from "@/lib/services/checklist.service";
import { listRecurringTemplates } from "@/lib/services/recurring.service";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [templates, recurring] = await Promise.all([
    listChecklistTemplates(),
    listRecurringTemplates(),
  ]);

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-xl space-y-8">
        <div className="space-y-2">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-semibold">Pengaturan</h1>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Checklist templates</h2>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada template. Seed via{" "}
              <code className="text-xs">pnpm seed:checklist</code>
            </p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {templates.map((t) => (
                <li key={t.template_id} className="py-2">
                  <Link
                    href={`/checklist-template/${t.template_id}`}
                    className="font-medium hover:underline"
                  >
                    {t.template_name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {t.template_id} · {t.items.length} item
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Recurring templates</h2>
          {recurring.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada template.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {recurring.map((t) => (
                <li key={t.template_id} className="py-2">
                  <p className="font-medium">{t.template_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.repeat_type} · {t.active_status ? "aktif" : "nonaktif"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <ul className="space-y-2 text-sm">
          <li>
            <Link href="/settings/sync-logs" className="hover:underline">
              Sync logs
            </Link>
          </li>
          <li>
            <Link href="/settings/staff" className="hover:underline">
              Staff
            </Link>
          </li>
          <li>
            <Link href="/recurring" className="hover:underline">
              Recurring page
            </Link>
          </li>
        </ul>
      </div>
    </main>
  );
}

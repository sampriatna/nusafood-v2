import Link from "next/link";
import { listRecurringTemplates } from "@/lib/services/recurring.service";

export const dynamic = "force-dynamic";

export default async function RecurringPage() {
  const templates = await listRecurringTemplates();

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-xl space-y-4">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold">Tugas berulang</h1>
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada template. Buat via{" "}
            <code className="text-xs">POST /api/recurring-templates</code>.
          </p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {templates.map((t) => (
              <li key={t.template_id} className="py-3">
                <p className="font-medium">{t.template_name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.outlet} · {t.repeat_type} @ {t.repeat_time} · deadline{" "}
                  {t.deadline_time} ·{" "}
                  {t.active_status ? "aktif" : "nonaktif"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

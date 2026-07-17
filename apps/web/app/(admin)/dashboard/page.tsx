import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { getDashboardSummary } from "@/lib/services/dashboard.service";
import { listTasks } from "@/lib/services/task.service";

export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1 border-b border-border pb-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const [summary, tasks] = await Promise.all([
    getDashboardSummary(),
    listTasks({ limit: 20, page: 1 }),
  ]);

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-2">
          <p className="text-sm text-muted-foreground">TaskNF3 v2 · staging</p>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Data dari PostgreSQL (read-only). Sync Sheets/GAS via{" "}
            <code className="text-xs">pnpm sync:from-gas</code>.
          </p>
        </header>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Total tugas" value={summary.tasks.total} />
          <Stat label="Open" value={summary.tasks.open} />
          <Stat label="Submitted" value={summary.tasks.submitted} />
          <Stat label="Done" value={summary.tasks.done} />
          <Stat label="Late" value={summary.tasks.late} />
          <Stat label="Revisi" value={summary.tasks.revisi} />
        </section>

        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-medium">Tugas terbaru</h2>
            <Link
              href="/api/tasks"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              JSON API
            </Link>
          </div>

          {tasks.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada tugas. Jalankan{" "}
              <code className="text-xs">
                pnpm sync:from-gas -- --file scripts/fixtures/sample-sync.json
              </code>
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {tasks.data.map((task) => (
                <li key={task.task_id} className="py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <Link
                        href={`/tasks/${task.task_id}`}
                        className="font-medium hover:underline"
                      >
                        {task.task_title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {task.task_id} · {task.outlet} · {task.area} ·{" "}
                        {task.pic_name}
                      </p>
                    </div>
                    <StatusBadge status={task.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-xs text-muted-foreground">
          Checklist summary: {summary.checklists.total} total ·{" "}
          {summary.checklists.open} open
        </p>
      </div>
    </main>
  );
}

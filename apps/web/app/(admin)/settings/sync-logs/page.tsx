import Link from "next/link";
import { listSyncLogs } from "@/lib/services/sync.service";

export const dynamic = "force-dynamic";

export default async function SyncLogsPage() {
  const logs = await listSyncLogs(100);
  const failed = logs.filter(
    (log) => log.v1Status === "failed" || log.v2Status === "failed",
  );

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-2">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-semibold">Sync logs</h1>
          <p className="text-sm text-muted-foreground">
            Monitoring dual-write / sync. {failed.length} gagal dari{" "}
            {logs.length} entri terbaru.
          </p>
        </div>

        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada log.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {logs.map((log) => (
              <li key={log.id} className="space-y-1 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">
                    {log.operation}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {log.entityType}
                      {log.entityId ? ` · ${log.entityId}` : ""}
                    </span>
                  </p>
                  <time className="text-xs text-muted-foreground">
                    {log.createdAt.toLocaleString("id-ID")}
                  </time>
                </div>
                <p className="text-xs text-muted-foreground">
                  v1: {log.v1Status ?? "—"} · v2: {log.v2Status ?? "—"}
                </p>
                {log.errorMessage ? (
                  <p className="text-xs text-destructive">{log.errorMessage}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

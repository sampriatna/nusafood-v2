import { Link2, Unplug } from "lucide-react";
import { AdminPage } from "@/components/admin-page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { authRequired, getSession } from "@/lib/auth";
import { getHrisIntegrationStatus, listHrisSyncLogs, listStaffNeedingManualReview } from "@/lib/services/hris-integration.service";
import { HrisSyncButton } from "./hris-sync-button";

export const dynamic = "force-dynamic";

function statusBadge(connected: boolean, enabled: boolean, configured: boolean) {
  if (!configured) return <Badge variant="secondary">Belum dikonfigurasi</Badge>;
  if (!enabled) return <Badge variant="secondary">Nonaktif (env)</Badge>;
  if (connected) return <Badge className="bg-emerald-600">Terhubung</Badge>;
  return <Badge variant="destructive">Gagal terhubung</Badge>;
}

export default async function HrisIntegrationPage() {
  const session = await getSession();
  const canManage =
    !authRequired() ||
    session?.userRole === "ADMIN" ||
    session?.userId === "env-admin";

  const [status, logs, manualReview] = await Promise.all([
    getHrisIntegrationStatus(),
    listHrisSyncLogs(10),
    listStaffNeedingManualReview(),
  ]);

  return (
    <AdminPage title="Integrasi HRIS" backHref="/settings">
      <Card className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            {status.connected ? (
              <Link2 className="size-5 text-primary" />
            ) : (
              <Unplug className="size-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">Status koneksi HRIS</h3>
              {statusBadge(status.connected, status.enabled, status.configured)}
            </div>
            <p className="text-sm text-muted-foreground">
              Staf di Task Dashboard disinkronkan dari HRIS (presensigpsv2) via
              REST API. Token API hanya disimpan di server — tidak ditampilkan di
              browser.
            </p>
          </div>
        </div>

        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Sync terakhir</dt>
            <dd className="font-medium">
              {status.last_sync_at
                ? new Date(status.last_sync_at).toLocaleString("id-ID")
                : "Belum pernah"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Hasil terakhir</dt>
            <dd className="font-medium">{status.last_sync_status ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Staf terhubung HRIS</dt>
            <dd className="font-medium">{status.staff_linked_count}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Perlu review manual</dt>
            <dd className="font-medium">
              {status.staff_manual_review_count + status.staff_unlinked_count}
            </dd>
          </div>
        </dl>

        {status.last_error ? (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {status.last_error}
          </p>
        ) : null}

        {canManage ? (
          <HrisSyncButton disabled={!status.enabled || !status.configured} />
        ) : null}
      </Card>

      {manualReview.length > 0 ? (
        <Card className="space-y-3 p-4">
          <h3 className="font-semibold">Staf belum terhubung ke HRIS</h3>
          <p className="text-sm text-muted-foreground">
            Tugas lama tetap dapat dibuka. Label &quot;Belum terhubung ke HRIS&quot;
            ditampilkan sampai mapping selesai.
          </p>
          <ul className="divide-y text-sm">
            {manualReview.slice(0, 20).map((s) => (
              <li key={s.staffId} className="flex justify-between py-2">
                <span>
                  {s.name}{" "}
                  <span className="text-muted-foreground">({s.staffId})</span>
                </span>
                <Badge variant="outline">{s.hrisLinkStatus}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="space-y-3 p-4">
        <h3 className="font-semibold">Riwayat sinkronisasi</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada log sync.</p>
        ) : (
          <ul className="divide-y text-sm">
            {logs.map((log) => (
              <li key={log.id} className="py-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <span>
                    {log.startedAt.toLocaleString("id-ID")}
                    {log.triggeredByName ? ` · ${log.triggeredByName}` : ""}
                  </span>
                  <Badge variant="outline">{log.status}</Badge>
                </div>
                <p className="text-muted-foreground">
                  +{log.createdCount} baru · {log.updatedCount} update ·{" "}
                  {log.deactivatedCount} nonaktif · {log.failedCount} gagal
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AdminPage>
  );
}

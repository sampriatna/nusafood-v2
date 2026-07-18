import { AdminPage } from "@/components/admin-page";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTimeId } from "@/lib/format-datetime";
import { listSyncLogs } from "@/lib/services/sync.service";

function metaField(
  v2Response: unknown,
  key: string,
): string | undefined {
  if (!v2Response || typeof v2Response !== "object") return undefined;
  const value = (v2Response as Record<string, unknown>)[key];
  return value != null ? String(value) : undefined;
}

export const dynamic = "force-dynamic";

export default async function SyncLogsPage() {
  const logs = await listSyncLogs(100);
  const failed = logs.filter(
    (log) => log.v1Status === "failed" || log.v2Status === "failed",
  );

  return (
    <AdminPage title="Sync Logs" backHref="/settings" maxWidth="3xl">
      <p className="text-sm text-muted-foreground">
        {failed.length} gagal dari {logs.length} entri terbaru
      </p>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Belum ada log.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="space-y-2 p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{log.operation}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.entityType}
                      {log.entityId ? ` · ${log.entityId}` : ""}
                    </p>
                  </div>
                  <time className="text-xs text-muted-foreground">
                    {formatDateTimeId(log.createdAt)} WIB
                  </time>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">v1: {log.v1Status ?? "—"}</Badge>
                  <Badge variant="outline">v2: {log.v2Status ?? "—"}</Badge>
                </div>
                {log.errorMessage ? (
                  <p className="text-xs text-destructive">{log.errorMessage}</p>
                ) : null}
                {metaField(log.v2Response, "task_id") ||
                metaField(log.v2Response, "actor_name") ||
                metaField(log.v2Response, "pic_wa") ? (
                  <p className="text-xs text-muted-foreground">
                    {[
                      metaField(log.v2Response, "task_id")
                        ? `task: ${metaField(log.v2Response, "task_id")}`
                        : null,
                      metaField(log.v2Response, "actor_name")
                        ? `actor: ${metaField(log.v2Response, "actor_name")}`
                        : null,
                      metaField(log.v2Response, "pic_wa")
                        ? `WA: ${metaField(log.v2Response, "pic_wa")}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminPage>
  );
}

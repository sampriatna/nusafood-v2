import { redirect } from "next/navigation";
import { AdminPage } from "@/components/admin-page";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { authRequired, getSession } from "@/lib/auth";
import { formatDateTimeId } from "@/lib/format-datetime";
import {
  canViewAuditLog,
  hasGlobalOutletScope,
  isOwner,
} from "@/lib/permissions";
import { resolveListOutletFilter } from "@/lib/outlet-scope";
import { listAuditLogs } from "@/lib/services/audit.service";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  const session = await getSession();
  if (authRequired() && !session) redirect("/login");
  if (authRequired() && session && !canViewAuditLog(session)) {
    redirect("/settings?error=forbidden");
  }

  const outletCode =
    session && !hasGlobalOutletScope(session)
      ? resolveListOutletFilter(session, null)
      : undefined;

  const logs = await listAuditLogs({
    limit: 100,
    outletCode,
  }).catch(() => []);

  const isOwnerView = !session || isOwner(session);

  return (
    <AdminPage title="Audit Log" backHref="/settings" maxWidth="3xl">
      <p className="text-sm text-muted-foreground">
        {logs.length} entri terbaru
        {outletCode ? ` · outlet ${outletCode}` : isOwnerView ? " · semua outlet" : ""}
        . Login, ubah role, ST/SP, dan aksi sensitif tercatat di sini.
      </p>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Belum ada audit log.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="space-y-2 p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{log.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.entity_type}
                      {log.entity_id ? ` · ${log.entity_id}` : ""}
                    </p>
                  </div>
                  <time className="text-xs text-muted-foreground">
                    {formatDateTimeId(log.created_at)} WIB
                  </time>
                </div>
                <div className="flex flex-wrap gap-2">
                  {log.actor_role ? (
                    <Badge variant="secondary">{log.actor_role}</Badge>
                  ) : (
                    <Badge variant="outline">{log.actor_type}</Badge>
                  )}
                  {log.outlet_code ? (
                    <Badge variant="outline">{log.outlet_code}</Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {[
                    log.actor_name ? `aktor: ${log.actor_name}` : null,
                    log.actor_id ? `id: ${log.actor_id}` : null,
                    log.note ? `catatan: ${log.note}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminPage>
  );
}

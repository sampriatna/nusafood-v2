import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getPositionGroupLabel } from "@/lib/position-groups";
import { listPositionDailyTemplateSummary } from "@/lib/services/daily-activity-seed.service";

const rows = listPositionDailyTemplateSummary();

export function DailyActivityTemplateCatalog() {
  const backOffice = rows.filter((r) =>
    [
      "Kasir",
      "Purchasing",
      "Gudang",
      "ProduksiFnB",
      "ProduksiNF",
      "Advertising",
      "AdminMP",
      "CSNF",
      "Finance",
      "Design",
    ].includes(r.position),
  );

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold">Template wajib per posisi (di database)</p>
            <p className="text-sm text-muted-foreground">
              {rows.length} kegiatan wajib — otomatis di-import saat database masih
              kosong. Tampil di Settings → Template Kegiatan.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Posisi</th>
                <th className="px-3 py-2 font-medium">Kegiatan wajib</th>
                <th className="px-3 py-2 font-medium">Checklist</th>
              </tr>
            </thead>
            <tbody>
              {backOffice.map((row) => (
                <tr key={row.code} className="border-t">
                  <td className="px-3 py-2">
                    {getPositionGroupLabel(row.position)}
                  </td>
                  <td className="px-3 py-2">{row.title}</td>
                  <td className="px-3 py-2">{row.checklist_count} item</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Plus template operasional Waiters, Bar, Dapur, PA, dan lapor kendala umum.
        </p>
      </CardContent>
    </Card>
  );
}

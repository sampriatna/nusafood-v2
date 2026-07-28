import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getPositionGroupLabel } from "@/lib/position-groups";
import {
  DAILY_ACTIVITY_SEED_TEMPLATES,
  listPositionDailyTemplateCounts,
} from "@/lib/daily-activity-seed";

const positionCounts = listPositionDailyTemplateCounts();
const requiredCount = DAILY_ACTIVITY_SEED_TEMPLATES.filter(
  (row) => row.is_required_daily && row.position_group,
).length;
const globalCount = DAILY_ACTIVITY_SEED_TEMPLATES.filter(
  (row) => !row.position_group,
).length;

export function DailyActivityTemplateCatalog() {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold">Template wajib per posisi (di database)</p>
            <p className="text-sm text-muted-foreground">
              {requiredCount} kegiatan wajib posisi + {globalCount} kegiatan
              global — otomatis di-import saat database masih kosong. Tampil di
              Settings → Template Kegiatan.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Posisi</th>
                <th className="px-3 py-2 font-medium">Kegiatan wajib</th>
                <th className="px-3 py-2 font-medium">Total checklist</th>
              </tr>
            </thead>
            <tbody>
              {positionCounts.map((row) => (
                <tr key={row.position} className="border-t">
                  <td className="px-3 py-2">
                    {getPositionGroupLabel(row.position)}
                  </td>
                  <td className="px-3 py-2">{row.activities}</td>
                  <td className="px-3 py-2">{row.checklist_items} item</td>
                </tr>
              ))}
              {globalCount > 0 ? (
                <tr className="border-t bg-muted/20">
                  <td className="px-3 py-2">Semua posisi</td>
                  <td className="px-3 py-2">{globalCount}</td>
                  <td className="px-3 py-2">
                    {DAILY_ACTIVITY_SEED_TEMPLATES.filter((row) => !row.position_group)
                      .reduce((sum, row) => sum + row.checklist.length, 0)}{" "}
                    item
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Termasuk Waiters, Bar, Dapur, PA, Supir/PA, Maintenance & Kebun, Leader
          Outlet, Marketing FnB/NF, dan posisi back-office.
        </p>
      </CardContent>
    </Card>
  );
}

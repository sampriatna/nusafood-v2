import { AdminPage } from "@/components/admin-page";
import { Card, CardContent } from "@/components/ui/card";
import { listAreas } from "@/lib/services/master-data.service";

export const dynamic = "force-dynamic";

export default async function AreasSettingsPage() {
  const areas = await listAreas();

  return (
    <AdminPage title="Master Area" backHref="/settings">
      <p className="text-sm text-muted-foreground">
        {areas.length} area terdaftar
      </p>
      <Card>
        <CardContent className="divide-y divide-border p-0">
          {areas.map((area) => (
            <div
              key={`${area.outlet ?? "all"}-${area.name}`}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <span className="font-medium">{area.name}</span>
              <span className="text-muted-foreground">
                {area.outlet ?? area.outlet_name ?? "—"}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </AdminPage>
  );
}

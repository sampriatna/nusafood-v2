import { SettingsBackLink } from "@/components/settings-back-link";
import { listAreas } from "@/lib/services/master-data.service";

export const dynamic = "force-dynamic";

export default async function AreasSettingsPage() {
  const areas = await listAreas();

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="space-y-2">
          <SettingsBackLink />
          <h1 className="text-2xl font-semibold">Master Area</h1>
          <p className="text-sm text-muted-foreground">
            {areas.length} area terdaftar
          </p>
        </div>
        <ul className="divide-y divide-border rounded-lg border border-border bg-card text-sm">
          {areas.map((area) => (
            <li
              key={`${area.outlet ?? "all"}-${area.name}`}
              className="flex items-center justify-between px-4 py-3"
            >
              <span className="font-medium">{area.name}</span>
              <span className="text-xs text-muted-foreground">
                {area.outlet ?? area.outlet_name ?? "—"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

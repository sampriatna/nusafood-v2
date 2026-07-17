import { SettingsBackLink } from "@/components/settings-back-link";
import { listAreas, listCategories, listOutlets } from "@/lib/services/master-data.service";
import { listRecurringTemplates } from "@/lib/services/recurring.service";
import { listStaff } from "@/lib/services/staff.service";
import { RecurringManager } from "./recurring-manager";

export const dynamic = "force-dynamic";

export default async function RecurringTasksSettingsPage() {
  const [templates, outlets, areas, categories, staff] = await Promise.all([
    listRecurringTemplates(),
    listOutlets(),
    listAreas(),
    listCategories(),
    listStaff(),
  ]);

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-2">
          <SettingsBackLink />
          <h1 className="text-2xl font-semibold">Template Tugas Berulang</h1>
          <p className="text-sm text-muted-foreground">
            Kelola jadwal tugas harian/mingguan dan item checklist per template.
          </p>
        </div>
        <RecurringManager
          templates={templates}
          outlets={outlets.map((o) => ({
            value: o.code,
            label: o.name,
          }))}
          areas={areas.map((a) => ({
            value: a.name,
            label: a.name,
            outlet: a.outlet,
          }))}
          categories={categories.map((c) => ({
            value: c.name,
            label: c.name,
          }))}
          staff={staff}
        />
      </div>
    </main>
  );
}

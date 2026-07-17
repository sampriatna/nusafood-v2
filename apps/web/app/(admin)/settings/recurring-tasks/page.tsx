import { AdminPage } from "@/components/admin-page";
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
    <AdminPage
      title="Template Tugas Berulang"
      backHref="/settings"
      maxWidth="3xl"
    >
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
    </AdminPage>
  );
}

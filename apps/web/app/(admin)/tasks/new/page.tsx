import {
  listAreas,
  listCategories,
  listOutlets,
} from "@/lib/services/master-data.service";
import { listStaff } from "@/lib/services/staff.service";
import { MobileHeader } from "@/components/mobile-header";
import { CreateTaskForm } from "./create-task-form";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const [outlets, areas, categories, staff] = await Promise.all([
    listOutlets(),
    listAreas(),
    listCategories(),
    listStaff({ status: "ACTIVE" }),
  ]);

  return (
    <div className="min-h-screen bg-background pb-8">
      <MobileHeader title="Buat Tugas Baru" showBack backHref="/dashboard" />
      <main className="mx-auto max-w-xl space-y-4 px-4 py-4 sm:px-6">
        <p className="text-sm text-muted-foreground">
          Pilih staff dari master data — nama dan nomor WA terisi otomatis.
        </p>
        <CreateTaskForm
          outlets={outlets.map((o) => ({
            value: o.code,
            label: `${o.code} — ${o.name}`,
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
      </main>
    </div>
  );
}

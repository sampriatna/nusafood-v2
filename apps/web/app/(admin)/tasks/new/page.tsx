import Link from "next/link";
import { listAreas, listCategories, listOutlets } from "@/lib/services/master-data.service";
import { CreateTaskForm } from "./create-task-form";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const [outlets, areas, categories] = await Promise.all([
    listOutlets(),
    listAreas("KBU"),
    listCategories(),
  ]);

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="space-y-2">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-semibold">Buat tugas</h1>
          <p className="text-sm text-muted-foreground">
            Write API v2. Dual-write ke GAS aktif jika{" "}
            <code className="text-xs">DUAL_WRITE_ENABLED=true</code>.
          </p>
        </div>
        <CreateTaskForm
          outlets={outlets.map((o) => ({
            value: o.code,
            label: `${o.code} — ${o.name}`,
          }))}
          areas={areas.map((a) => ({ value: a.name, label: a.name }))}
          categories={categories.map((c) => ({
            value: c.name,
            label: c.name,
          }))}
        />
      </div>
    </main>
  );
}

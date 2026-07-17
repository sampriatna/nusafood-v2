import { SettingsBackLink } from "@/components/settings-back-link";
import { listCategories } from "@/lib/services/master-data.service";

export const dynamic = "force-dynamic";

export default async function CategoriesSettingsPage() {
  const categories = await listCategories();

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="space-y-2">
          <SettingsBackLink />
          <h1 className="text-2xl font-semibold">Master Kategori</h1>
          <p className="text-sm text-muted-foreground">
            {categories.length} kategori terdaftar
          </p>
        </div>
        <ul className="divide-y divide-border rounded-lg border border-border bg-card text-sm">
          {categories.map((category) => (
            <li key={category.name} className="px-4 py-3 font-medium">
              {category.name}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

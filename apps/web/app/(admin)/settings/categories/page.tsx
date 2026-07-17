import { AdminPage } from "@/components/admin-page";
import { Card, CardContent } from "@/components/ui/card";
import { listCategories } from "@/lib/services/master-data.service";

export const dynamic = "force-dynamic";

export default async function CategoriesSettingsPage() {
  const categories = await listCategories();

  return (
    <AdminPage title="Master Kategori" backHref="/settings">
      <p className="text-sm text-muted-foreground">
        {categories.length} kategori terdaftar
      </p>
      <Card>
        <CardContent className="divide-y divide-border p-0">
          {categories.map((category) => (
            <div key={category.name} className="px-4 py-3 text-sm font-medium">
              {category.name}
            </div>
          ))}
        </CardContent>
      </Card>
    </AdminPage>
  );
}

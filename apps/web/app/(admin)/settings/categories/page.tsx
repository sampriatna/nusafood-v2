import { AdminPage } from "@/components/admin-page";
import { authRequired, getSession } from "@/lib/auth";
import { listCategories } from "@/lib/services/master-data.service";
import { CategoriesManager } from "./categories-manager";

export const dynamic = "force-dynamic";

export default async function CategoriesSettingsPage() {
  const [categories, session] = await Promise.all([
    listCategories(),
    getSession(),
  ]);

  const canManage =
    !authRequired() ||
    session?.userRole === "ADMIN" ||
    session?.userId === "env-admin";

  return (
    <AdminPage title="Master Kategori" backHref="/settings">
      <p className="text-sm text-muted-foreground">
        {categories.length} kategori terdaftar
      </p>
      <CategoriesManager categories={categories} canManage={canManage} />
    </AdminPage>
  );
}

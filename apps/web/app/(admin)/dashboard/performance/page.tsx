import { AdminPage } from "@/components/admin-page";
import { getSession } from "@/lib/auth";
import { PerformanceClient } from "./performance-client";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const session = await getSession();
  const canPickOutlet = !session || session.userRole === "ADMIN";
  return (
    <AdminPage title="Kinerja" backHref="/dashboard" maxWidth="3xl">
      <PerformanceClient canPickOutlet={canPickOutlet} />
    </AdminPage>
  );
}

import { Info } from "lucide-react";
import { AdminPage } from "@/components/admin-page";
import { DailyActivityAdminPanel } from "@/components/daily-activity-admin-panel";
import { Card, CardContent } from "@/components/ui/card";
import { authRequired, getSession } from "@/lib/auth";
import { getDailyActivitySetupStats } from "@/lib/services/daily-activity-setup.service";

export const dynamic = "force-dynamic";

export default async function DailyActivitySettingsPage() {
  const session = await getSession();
  const canManage =
    !authRequired() ||
    session?.userRole === "ADMIN" ||
    session?.userId === "env-admin";

  const stats = await getDailyActivitySetupStats();

  return (
    <AdminPage title="Daily Activity SOP" backHref="/settings" maxWidth="3xl">
      <DailyActivityAdminPanel canManage={canManage} stats={stats} />

      <Card className="border-blue-200/80 bg-blue-50/70">
        <CardContent className="flex gap-3 p-4 text-sm text-blue-900">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>
            <strong>Daily Activity</strong> = checklist harian per staff via link
            `/r/nama`. Terpisah dari task lama (deadline, WA, approval leader).
          </p>
        </CardContent>
      </Card>
    </AdminPage>
  );
}

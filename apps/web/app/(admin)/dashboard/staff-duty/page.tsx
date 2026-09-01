import { AdminPage } from "@/components/admin-page";
import { authRequired, getSession } from "@/lib/auth";
import { todayKeyInAppTz } from "@/lib/format-datetime";
import { resolveListOutletFilter } from "@/lib/outlet-scope";
import { listStaff } from "@/lib/services/staff.service";
import { listStaffJobSettings } from "@/lib/services/staff-job-profile.service";
import { StaffDutyClient } from "./staff-duty-client";

export const dynamic = "force-dynamic";

export default async function StaffDutyPage() {
  const session = await getSession();
  const outlet =
    session?.userRole === "LEADER"
      ? resolveListOutletFilter(session, null)
      : undefined;
  const staff = await listStaff({ status: "ACTIVE", outlet });
  const today = todayKeyInAppTz();
  const settings = await listStaffJobSettings(
    staff.map((member) => member.staff_id),
    today,
  );

  const canEditProfile =
    !authRequired() ||
    session?.userRole === "ADMIN" ||
    session?.userId === "env-admin";
  const canSetDuty =
    !authRequired() ||
    session?.userRole === "ADMIN" ||
    session?.userRole === "LEADER" ||
    session?.userId === "env-admin";

  return (
    <AdminPage title="Posisi Kerja Hari Ini" backHref="/dashboard/daily-reports" maxWidth="3xl">
      <StaffDutyClient
        staff={staff}
        settings={settings}
        today={today}
        canEditProfile={canEditProfile}
        canSetDuty={canSetDuty}
      />
    </AdminPage>
  );
}

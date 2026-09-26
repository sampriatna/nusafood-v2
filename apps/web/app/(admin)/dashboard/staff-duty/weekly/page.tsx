import { AdminPage } from "@/components/admin-page";
import { getSession } from "@/lib/auth";
import { listOutlets } from "@/lib/services/master-data.service";
import { WeeklyRosterClient } from "./weekly-roster-client";

export const dynamic = "force-dynamic";

export default async function WeeklyRosterPage() {
  const session = await getSession();
  const isLeader = session?.userRole === "LEADER";
  const outlets = isLeader ? [] : await listOutlets();

  return (
    <AdminPage title="Jadwal Posisi Mingguan" backHref="/dashboard/staff-duty" maxWidth="3xl">
      <WeeklyRosterClient
        outlets={outlets.map((o) => ({ code: o.code, name: o.name }))}
        lockedOutlet={isLeader ? session?.userOutlet ?? "" : ""}
      />
    </AdminPage>
  );
}

import { SettingsBackLink } from "@/components/settings-back-link";
import { Badge } from "@/components/ui/badge";
import { listStaff } from "@/lib/services/staff.service";

export const dynamic = "force-dynamic";

export default async function StaffSettingsPage() {
  const staff = await listStaff();

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-2">
          <SettingsBackLink />
          <h1 className="text-2xl font-semibold">Master Staff</h1>
          <p className="text-sm text-muted-foreground">
            {staff.length} staf · data dari PostgreSQL (sync v1 via{" "}
            <code className="text-xs">pnpm sync:from-gas</code>)
          </p>
        </div>

        {staff.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada data staff. Jalankan sync dari v1 atau seed manual.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {staff.map((member) => (
              <li key={member.staff_id} className="space-y-1 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{member.name}</p>
                  <Badge variant="outline">{member.role}</Badge>
                  <Badge
                    variant={
                      member.status === "ACTIVE" ? "default" : "secondary"
                    }
                  >
                    {member.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {member.outlet}
                  {member.area ? ` · ${member.area}` : ""}
                  {member.position ? ` · ${member.position}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {member.wa_number} · {member.staff_id}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

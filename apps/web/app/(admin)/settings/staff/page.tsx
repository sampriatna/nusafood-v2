import { AdminPage } from "@/components/admin-page";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { listStaff } from "@/lib/services/staff.service";

export const dynamic = "force-dynamic";

export default async function StaffSettingsPage() {
  const staff = await listStaff();

  return (
    <AdminPage title="Master Staff" backHref="/settings">
      <p className="text-sm text-muted-foreground">
        {staff.length} staf · sync dari v1 via{" "}
        <code className="text-xs">pnpm sync:from-gas</code>
      </p>

      {staff.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Belum ada data staff.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {staff.map((member) => (
            <Card key={member.staff_id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{member.name}</p>
                  <Badge variant="outline">{member.role}</Badge>
                  <Badge
                    variant={
                      member.status === "ACTIVE" ? "default" : "secondary"
                    }
                  >
                    {member.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {member.outlet}
                  {member.area ? ` · ${member.area}` : ""}
                  {member.position ? ` · ${member.position}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {member.wa_number}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminPage>
  );
}

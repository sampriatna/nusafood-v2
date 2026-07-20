import { redirect } from "next/navigation";
import { authRequired, getSession } from "@/lib/auth";
import { canAccessAdminDashboard, isStaff } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function StaffPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (authRequired()) {
    const session = await getSession();
    if (!session) {
      redirect("/login?next=/letters");
    }
    // Admin/Leader boleh lihat portal staff untuk preview; STAFF wajib
    if (!isStaff(session) && !canAccessAdminDashboard(session)) {
      redirect("/login?error=forbidden");
    }
  }

  return <>{children}</>;
}

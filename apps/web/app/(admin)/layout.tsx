import { redirect } from "next/navigation";
import { authRequired, getSession } from "@/lib/auth";
import { canAccessAdminDashboard } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (authRequired()) {
    const session = await getSession();
    if (!session) {
      redirect("/login");
    }
    if (!canAccessAdminDashboard(session)) {
      redirect("/login?error=forbidden");
    }
  }

  return <>{children}</>;
}

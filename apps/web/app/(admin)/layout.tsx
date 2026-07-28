import { redirect } from "next/navigation";
import { authRequired, getSession } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!authRequired()) {
    return children;
  }

  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.userRole !== "ADMIN" && session.userRole !== "LEADER") {
    redirect("/login?error=forbidden");
  }

  return children;
}

import { redirect } from "next/navigation";
import type { SessionPayload } from "@/lib/auth";
import { authRequired } from "@/lib/auth";

export function isHrisAdmin(session: SessionPayload | null): boolean {
  if (!authRequired()) return true;
  if (!session) return false;
  return session.userRole === "ADMIN" || session.userId === "env-admin";
}

/** Server-side guard — non-admin tidak boleh melihat data integrasi HRIS. */
export function requireHrisAdminSession(session: SessionPayload | null): void {
  if (isHrisAdmin(session)) return;
  redirect("/dashboard");
}

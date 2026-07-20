import type { Staff } from "@nusafood/types";
import { setStaffCache } from "@/lib/staff-report-store";
import { ensureStaffReportCache } from "@/lib/ensure-staff-report-cache";
import { requireAuth } from "@/lib/require-auth";
import { ok, fail } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/** Admin syncs staff list from client into in-memory store. */
export async function POST(request: Request) {
  await ensureStaffReportCache();
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const raw = Array.isArray(body.staff) ? body.staff : [];
    const staff: Staff[] = raw
      .map((s: Record<string, unknown>) => ({
        staff_id: String(s.staff_id || ""),
        name: String(s.name || ""),
        position: String(s.position || ""),
        outlet: (s.outlet || "KBU") as Staff["outlet"],
        area: (s.area || "Dapur") as Staff["area"],
        wa_number: String(s.wa_number || ""),
        role: (s.role || "STAFF") as Staff["role"],
        status: (s.status === "INACTIVE" ? "INACTIVE" : "ACTIVE") as Staff["status"],
        created_at: String(s.created_at || ""),
        updated_at: String(s.updated_at || ""),
      }))
      .filter((s: Staff) => s.staff_id);

    if (staff.length > 0) {
      setStaffCache(staff);
    }

    return ok({ count: staff.length });
  } catch {
    return fail("Invalid body", { status: 400 });
  }
}

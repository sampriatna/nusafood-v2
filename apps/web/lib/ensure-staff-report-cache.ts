import { listStaff } from "@/lib/services/staff.service";
import { getStaffCache, setStaffCache } from "@/lib/staff-report-store";

export async function ensureStaffReportCache() {
  // Always refresh from DB when available so links match real staff
  try {
    const staff = await listStaff({ status: "ACTIVE" });
    if (staff.length > 0) setStaffCache(staff);
  } catch {
    // keep seed cache
  }
  return getStaffCache();
}

import type { Staff } from "@nusafood/types";
import {
  listStaffReportLinks,
  generateStaffReportLink,
  setStaffCache,
} from "@/lib/staff-report-store";
import { ensureStaffReportCache } from "@/lib/ensure-staff-report-cache";
import { requireAuth } from "@/lib/require-auth";
import { ok, fail } from "@/lib/api/response";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function originFromRequest(request: Request): string {
  return new URL(request.url).origin;
}

function applyStaffFromBody(body: Record<string, unknown>) {
  if (!Array.isArray(body.staff)) return;
  const staff = (body.staff as Record<string, unknown>[])
    .map((s) => ({
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
    .filter((s) => s.staff_id);
  if (staff.length > 0) setStaffCache(staff);
}

export async function GET(request: Request) {
  await ensureStaffReportCache();
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  return ok(listStaffReportLinks(originFromRequest(request)));
}

export async function POST(request: Request) {
  await ensureStaffReportCache();
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    applyStaffFromBody(body);

    const staffId = String(body.staff_id || "");
    if (!staffId) {
      return fail("staff_id wajib diisi", { status: 400 });
    }

    const result = generateStaffReportLink(staffId, originFromRequest(request));
    if (!result.success) {
      return fail(result.error, { status: 400 });
    }
    return NextResponse.json({ success: true, data: result.data, error: null });
  } catch {
    return fail("Invalid request body", { status: 400 });
  }
}

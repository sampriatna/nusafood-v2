import { revokeStaffReportLink } from "@/lib/staff-report-store";
import { ensureStaffReportCache } from "@/lib/ensure-staff-report-cache";
import { requireAuth } from "@/lib/require-auth";
import { fail } from "@/lib/api/response";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await ensureStaffReportCache();
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const result = revokeStaffReportLink(id);
  if (!result.success) {
    return fail(result.error, { status: 404 });
  }
  return NextResponse.json({ success: true, data: result.data, error: null });
}

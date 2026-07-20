import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  DailyActivityError,
  revokeStaffReportLink,
} from "@/lib/services/daily-activity.service";

export const dynamic = "force-dynamic";

function originFromRequest(request: Request): string {
  return new URL(request.url).origin;
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const link = await revokeStaffReportLink(id, originFromRequest(request));
    return ok(link);
  } catch (error) {
    if (error instanceof DailyActivityError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[DELETE /api/staff-reports/links/:id]", error);
    return fail("Gagal revoke link", {
      code: "LINK_REVOKE_FAILED",
      status: 500,
    });
  }
}

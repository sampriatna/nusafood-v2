import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { HrisApiError } from "@/lib/services/hris-api.client";
import { manuallyLinkStaffToHris } from "@/lib/services/hris-staff-sync.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      staff_id?: string;
      hris_staff_id?: string;
    };

    if (!body.staff_id?.trim() || !body.hris_staff_id?.trim()) {
      return fail("staff_id dan hris_staff_id wajib", {
        code: "VALIDATION_ERROR",
        status: 422,
      });
    }

    await manuallyLinkStaffToHris(body.staff_id.trim(), body.hris_staff_id.trim());
    return ok({ linked: true });
  } catch (error) {
    if (error instanceof HrisApiError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/internal/hris/link]", error);
    return fail("Gagal menghubungkan staf ke HRIS", {
      code: "HRIS_LINK_FAILED",
      status: 500,
    });
  }
}

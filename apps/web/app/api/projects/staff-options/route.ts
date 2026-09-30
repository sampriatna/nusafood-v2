import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { listProjectStaffOptions } from "@/lib/services/project.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    return ok(await listProjectStaffOptions());
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Gagal memuat staff", {
      status: 500,
    });
  }
}

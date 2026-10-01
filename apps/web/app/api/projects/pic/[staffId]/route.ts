import { projectFail } from "@/lib/api/project-route";
import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { getPicWorkload } from "@/lib/services/project.service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ staffId: string }> }) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const { staffId } = await context.params;
    const workload = await getPicWorkload(staffId);
    return workload ? ok(workload) : fail("Staff tidak ditemukan", { status: 404 });
  } catch (error) {
    return projectFail(error, "Gagal memuat beban kerja PIC");
  }
}

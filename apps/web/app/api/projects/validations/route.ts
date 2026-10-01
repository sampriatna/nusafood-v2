import { projectFail } from "@/lib/api/project-route";
import { ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { listPendingValidations } from "@/lib/services/project.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    return ok(await listPendingValidations());
  } catch (error) {
    return projectFail(error, "Gagal memuat antrian validasi");
  }
}

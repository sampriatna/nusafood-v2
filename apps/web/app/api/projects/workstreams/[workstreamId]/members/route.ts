import { actorFromAuth, projectFail } from "@/lib/api/project-route";
import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { addWorkstreamMember, removeWorkstreamMember } from "@/lib/services/project.service";

export async function POST(request: Request, context: { params: Promise<{ workstreamId: string }> }) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const { workstreamId } = await context.params;
    const body = await request.json();
    const staffId = String(body.staff_id || "").trim();
    if (!staffId) return fail("Pilih anggota", { code: "MEMBER_REQUIRED", status: 422 });
    await addWorkstreamMember(workstreamId, staffId, actorFromAuth(auth));
    return ok({ added: true }, undefined, { status: 201 });
  } catch (error) {
    return projectFail(error, "Gagal menambah anggota");
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ workstreamId: string }> }) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const { workstreamId } = await context.params;
    const body = await request.json();
    await removeWorkstreamMember(workstreamId, String(body.staff_id || ""), actorFromAuth(auth));
    return ok({ removed: true });
  } catch (error) {
    return projectFail(error, "Gagal mengeluarkan anggota");
  }
}

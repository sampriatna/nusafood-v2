import { actorFromAuth, projectFail } from "@/lib/api/project-route";
import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  ensureProjectPicLink,
  listProjectPicLinks,
  revokeProjectPicLink,
} from "@/lib/services/project-pic.service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const { projectId } = await context.params;
    return ok(await listProjectPicLinks(projectId));
  } catch (error) {
    return projectFail(error, "Gagal memuat link PIC");
  }
}

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const { projectId } = await context.params;
    const body = await request.json();
    const staffId = String(body.staff_id || "").trim();
    if (!staffId) return fail("PIC wajib dipilih", { status: 422 });
    return ok(
      await ensureProjectPicLink(projectId, staffId, actorFromAuth(auth), { rotate: body.rotate === true }),
      undefined,
      { status: 201 },
    );
  } catch (error) {
    return projectFail(error, "Gagal membuat link PIC");
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const { projectId } = await context.params;
    const body = await request.json();
    const staffId = String(body.staff_id || "").trim();
    if (!staffId) return fail("PIC wajib dipilih", { status: 422 });
    await revokeProjectPicLink(projectId, staffId, actorFromAuth(auth));
    return ok({ revoked: true });
  } catch (error) {
    return projectFail(error, "Gagal menonaktifkan link");
  }
}

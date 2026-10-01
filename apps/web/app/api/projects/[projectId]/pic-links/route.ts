import { fail, ok, publicErrorMessage } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  ensureProjectPicLink,
  listProjectPicLinks,
  revokeProjectPicLink,
} from "@/lib/services/project-pic.service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { projectId } = await context.params;
    return ok(await listProjectPicLinks(projectId));
  } catch (error) {
    return fail(publicErrorMessage(error, "Gagal memuat link PIC"), {
      status: 500,
    });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { projectId } = await context.params;
    const body = await request.json();
    const staffId = String(body.staff_id || "").trim();
    if (!staffId) return fail("PIC wajib dipilih");
    return ok(await ensureProjectPicLink(projectId, staffId), undefined, {
      status: 201,
    });
  } catch (error) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number((error as { status?: number }).status || 500)
        : 500;
    return fail(publicErrorMessage(error, "Gagal membuat link PIC"), {
      status,
    });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { projectId } = await context.params;
    const body = await request.json();
    const staffId = String(body.staff_id || "").trim();
    if (!staffId) return fail("PIC wajib dipilih");
    await revokeProjectPicLink(projectId, staffId);
    return ok({ revoked: true });
  } catch (error) {
    return fail(publicErrorMessage(error, "Gagal menonaktifkan link"), {
      status: 500,
    });
  }
}

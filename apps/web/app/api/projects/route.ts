import { fail, ok, publicErrorMessage } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  createProject,
  listProjects,
} from "@/lib/services/project.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const owner = new URL(request.url).searchParams.get("owner") || undefined;
    return ok(await listProjects(owner));
  } catch (error) {
    return fail(publicErrorMessage(error, "Gagal memuat project"), {
      status: 500,
    });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    if (!name) return fail("Nama project wajib diisi");

    return ok(
      await createProject({
        name,
        goal: body.goal ? String(body.goal) : null,
        lead_staff_id: body.lead_staff_id ? String(body.lead_staff_id) : null,
        start_date: body.start_date ? String(body.start_date) : null,
        deadline: body.deadline ? String(body.deadline) : null,
        next_action: body.next_action ? String(body.next_action) : null,
        created_by:
          auth.session?.userName || auth.session?.userId || "Admin",
      }),
      undefined,
      { status: 201 },
    );
  } catch (error) {
    return fail(publicErrorMessage(error, "Gagal membuat project"), {
      status: 500,
    });
  }
}

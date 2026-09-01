import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  OutletAccessError,
  assertStaffOutletAccess,
} from "@/lib/outlet-scope";
import {
  StaffJobError,
  setStaffActivePositions,
  updateStaffSecondaryPositions,
} from "@/lib/services/staff-job-profile.service";

export const dynamic = "force-dynamic";

function actorName(session: NonNullable<Awaited<ReturnType<typeof requireAuth>>["session"]>) {
  return session.userName || session.userId || "system";
}

/** Admin: atur kompetensi / jabatan tambahan. */
export async function PUT(
  request: Request,
  context: { params: Promise<{ staffId: string }> },
) {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const { staffId } = await context.params;
    const body = (await request.json()) as { secondary_positions?: unknown };
    const data = await updateStaffSecondaryPositions({
      staffId,
      positions: body.secondary_positions ?? [],
      actor: actorName(auth.session!),
    });
    return ok(data);
  } catch (error) {
    if (error instanceof StaffJobError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[PUT /api/staff-jobs/:staffId]", error);
    return fail("Gagal menyimpan jabatan tambahan", {
      code: "STAFF_JOB_PROFILE_FAILED",
      status: 500,
    });
  }
}

/** Admin/Leader: pilih posisi yang benar-benar dijalankan hari ini. */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ staffId: string }> },
) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { staffId } = await context.params;
    await assertStaffOutletAccess(auth.session!, staffId);

    const body = (await request.json()) as {
      active_positions?: unknown;
      date?: string;
    };
    const data = await setStaffActivePositions({
      staffId,
      positions: body.active_positions ?? [],
      date: body.date,
      actor: actorName(auth.session!),
    });
    return ok(data);
  } catch (error) {
    if (error instanceof StaffJobError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[PATCH /api/staff-jobs/:staffId]", error);
    return fail("Gagal menyimpan posisi kerja hari ini", {
      code: "STAFF_DUTY_FAILED",
      status: 500,
    });
  }
}

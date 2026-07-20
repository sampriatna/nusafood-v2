import { fail, ok } from "@/lib/api/response";
import {
  assertDisciplinaryLetterOutletAccess,
  OutletAccessError,
} from "@/lib/outlet-scope";
import { isStaff } from "@/lib/permissions";
import { requireAuth } from "@/lib/require-auth";
import {
  DisciplinaryError,
  acknowledgeLetter,
  getDisciplinaryLetter,
} from "@/lib/services/disciplinary.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Acknowledge surat — STAFF (milik sendiri) atau ADMIN/LEADER (proxy operasional).
 * Dipisah dari /actions agar STAFF tidak perlu akses penuh actions API.
 */
export async function POST(_request: Request, { params }: Params) {
  const auth = await requireAuth(["STAFF", "ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  if (!auth.session) {
    return fail("Unauthorized", { code: "UNAUTHORIZED", status: 401 });
  }

  try {
    const { id } = await params;

    if (!isStaff(auth.session)) {
      await assertDisciplinaryLetterOutletAccess(auth.session, id);
    } else {
      const letter = await getDisciplinaryLetter(id);
      if (!letter) {
        return fail("Surat tidak ditemukan.", { code: "NOT_FOUND", status: 404 });
      }
      if (letter.employee_id !== auth.session.staffId) {
        return fail("Akses ditolak. Surat ini bukan milik kamu.", {
          code: "FORBIDDEN",
          status: 403,
        });
      }
    }

    return ok(await acknowledgeLetter(id, auth.session));
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    if (error instanceof DisciplinaryError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/disciplinary/:id/acknowledge]", error);
    return fail("Gagal acknowledge surat", { status: 500 });
  }
}

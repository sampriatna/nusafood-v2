import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  DisciplinaryError,
  listMyDisciplinaryLetters,
} from "@/lib/services/disciplinary.service";

export const dynamic = "force-dynamic";

/** Surat ST/SP milik staff yang login (session.staffId). */
export async function GET() {
  const auth = await requireAuth(["STAFF", "ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  if (!auth.session) {
    return fail("Unauthorized", { code: "UNAUTHORIZED", status: 401 });
  }

  const staffId = auth.session.staffId;
  if (!staffId) {
    return fail(
      "Akun belum terhubung ke staff. Hubungkan staff_id pada user login.",
      { code: "STAFF_ID_MISSING", status: 403 },
    );
  }

  try {
    const letters = await listMyDisciplinaryLetters(staffId);
    return ok(letters, { total: letters.length });
  } catch (error) {
    if (error instanceof DisciplinaryError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[GET /api/disciplinary/mine]", error);
    return fail("Gagal memuat surat saya", { status: 500 });
  }
}

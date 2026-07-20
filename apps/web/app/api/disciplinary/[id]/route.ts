import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import type { UpdateDisciplinaryLetterPayload } from "@nusafood/types";
import {
  DisciplinaryError,
  getDisciplinaryLetter,
  updateDisciplinaryLetter,
} from "@/lib/services/disciplinary.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const letter = await getDisciplinaryLetter(id);
    if (!letter) {
      return fail("Surat tidak ditemukan.", { code: "NOT_FOUND", status: 404 });
    }
    return ok(letter);
  } catch (error) {
    if (error instanceof DisciplinaryError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[GET /api/disciplinary/:id]", error);
    return fail("Gagal memuat detail surat", { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = (await request.json()) as Omit<UpdateDisciplinaryLetterPayload, "id">;
    const letter = await updateDisciplinaryLetter({ ...body, id }, auth.session);
    return ok(letter);
  } catch (error) {
    if (error instanceof DisciplinaryError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[PATCH /api/disciplinary/:id]", error);
    return fail("Gagal memperbarui surat", { status: 500 });
  }
}

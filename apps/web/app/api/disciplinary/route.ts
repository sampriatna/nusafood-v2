import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  OutletAccessError,
  resolveListOutletFilter,
} from "@/lib/outlet-scope";
import type {
  CreateDisciplinaryLetterPayload,
  DisciplinaryFilters,
  DisciplinaryLetterLevel,
  DisciplinaryLetterStatus,
  DisciplinaryLetterType,
} from "@nusafood/types";
import {
  DisciplinaryError,
  createDisciplinaryLetter,
  getDisciplinaryDashboard,
} from "@/lib/services/disciplinary.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  if (!auth.session) {
    return fail("Unauthorized", { code: "UNAUTHORIZED", status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const outlet = resolveListOutletFilter(
      auth.session,
      searchParams.get("outlet"),
    );
    const filters: DisciplinaryFilters = {
      outlet,
      employee_id: searchParams.get("employee_id") || undefined,
      type: (searchParams.get("type") as DisciplinaryLetterType | "ALL") || undefined,
      level:
        (searchParams.get("level") as DisciplinaryLetterLevel | "ALL") ||
        undefined,
      status:
        (searchParams.get("status") as DisciplinaryLetterStatus | "ALL") ||
        undefined,
      date_from: searchParams.get("date_from") || undefined,
      date_to: searchParams.get("date_to") || undefined,
    };
    return ok(await getDisciplinaryDashboard(filters));
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    if (error instanceof DisciplinaryError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[GET /api/disciplinary]", error);
    return fail("Gagal memuat Teguran Center", {
      code: "DISCIPLINARY_LIST_FAILED",
      status: 500,
    });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as CreateDisciplinaryLetterPayload;
    const letter = await createDisciplinaryLetter(body, auth.session);
    return ok(letter);
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    if (error instanceof DisciplinaryError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/disciplinary]", error);
    return fail("Gagal membuat teguran", {
      code: "DISCIPLINARY_CREATE_FAILED",
      status: 500,
    });
  }
}

import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  MasterDataError,
  createArea,
  listAreas,
} from "@/lib/services/master-data.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const outlet = new URL(request.url).searchParams.get("outlet") ?? undefined;
    const data = await listAreas(outlet);
    return ok(data, { total: data.length });
  } catch (error) {
    console.error("[GET /api/areas]", error);
    return fail("Gagal mengambil data area", {
      code: "AREAS_LIST_FAILED",
      status: 500,
    });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as { outlet?: string; name?: string };
    if (!body.outlet || !body.name) {
      return fail("outlet dan name wajib", { status: 400 });
    }
    const data = await createArea(body.outlet, body.name);
    return ok(data, undefined, { status: 201 });
  } catch (error) {
    if (error instanceof MasterDataError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/areas]", error);
    return fail("Gagal membuat area", {
      code: "AREA_CREATE_FAILED",
      status: 500,
    });
  }
}

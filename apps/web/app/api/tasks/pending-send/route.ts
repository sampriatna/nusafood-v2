import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import { OutletAccessError, resolveListOutletFilter } from "@/lib/outlet-scope";
import { listPendingSend } from "@/lib/services/pending-send.service";

export const dynamic = "force-dynamic";

/** Daftar tugas yang belum dikirim WA-nya → kotak "Siap Dikirim" di dashboard. */
export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const outlet = auth.session
      ? resolveListOutletFilter(auth.session, searchParams.get("outlet"))
      : searchParams.get("outlet") || undefined;
    return ok(await listPendingSend(outlet));
  } catch (error) {
    if (error instanceof OutletAccessError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[GET /api/tasks/pending-send]", error);
    return fail("Gagal mengambil tugas yang belum dikirim", {
      code: "PENDING_SEND_FAILED",
      status: 500,
    });
  }
}

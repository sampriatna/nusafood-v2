import { normalizeOutletCode } from "@nusafood/database/normalizers";
import { fail, ok } from "@/lib/api/response";
import type { SessionPayload } from "@/lib/auth";
import { requireAuth } from "@/lib/require-auth";
import {
  OutletAccessError,
  assertOutletAccess,
  isGlobalAdmin,
  requireLeaderOutlet,
} from "@/lib/outlet-scope";
import {
  RosterError,
  getWeeklyRoster,
  saveWeeklyRoster,
  type RosterCells,
  type ShiftCells,
} from "@/lib/services/weekly-roster.service";

export const dynamic = "force-dynamic";

function resolveOutlet(session: SessionPayload | null, requested?: string | null): string {
  if (session && !isGlobalAdmin(session)) return requireLeaderOutlet(session).code;
  const code = normalizeOutletCode(requested ?? "");
  if (!code) throw new RosterError("Pilih outlet dulu");
  if (session) assertOutletAccess(session, { outletCode: code });
  return code;
}

function handleError(error: unknown, label: string) {
  if (error instanceof RosterError || error instanceof OutletAccessError) {
    return fail(error.message, { code: error.code, status: error.status });
  }
  console.error(`[${label} /api/staff-duty/weekly]`, error);
  return fail("Gagal memproses jadwal mingguan", { status: 500 });
}

export async function GET(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(request.url);
    const outlet = resolveOutlet(auth.session, searchParams.get("outlet"));
    return ok(await getWeeklyRoster(outlet, searchParams.get("week") ?? undefined));
  } catch (error) {
    return handleError(error, "GET");
  }
}

export async function PUT(request: Request) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;
  try {
    const body = (await request.json()) as {
      outlet?: string;
      week_start?: string;
      cells?: RosterCells;
      shift_cells?: ShiftCells;
    };
    if (!body.week_start || !body.cells) {
      return fail("Data jadwal tidak lengkap", { code: "VALIDATION" });
    }
    const outlet = resolveOutlet(auth.session, body.outlet);
    const data = await saveWeeklyRoster({
      outletCode: outlet,
      weekStart: body.week_start,
      cells: body.cells,
      shiftCells: body.shift_cells,
      actor: auth.session?.userName || auth.session?.userId || undefined,
    });
    return ok(data);
  } catch (error) {
    return handleError(error, "PUT");
  }
}

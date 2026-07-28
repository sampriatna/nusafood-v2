import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  internalAuthFailure,
  verifyInternalRequest,
} from "@/lib/internal-auth";
import { HrisApiError } from "@/lib/services/hris-api.client";
import { runHrisStaffSync } from "@/lib/services/hris-staff-sync.service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function runSync(request: Request, actor?: { id: string; name: string }) {
  let updatedSince: string | undefined;
  try {
    const body = (await request.json()) as { updated_since?: string };
    updatedSince = body.updated_since;
  } catch {
    updatedSince = undefined;
  }

  const result = await runHrisStaffSync({
    updatedSince,
    triggeredBy: actor?.id ?? "cron",
    triggeredByName: actor?.name ?? "Scheduled sync",
  });

  return ok(result);
}

/** Vercel Cron — GET dengan Bearer CRON_SECRET */
export async function GET(request: Request) {
  if (!verifyInternalRequest(request)) {
    return internalAuthFailure();
  }

  try {
    return await runSync(request);
  } catch (error) {
    if (error instanceof HrisApiError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[GET /api/internal/hris/sync]", error);
    return fail("Sinkronisasi HRIS gagal", {
      code: "HRIS_SYNC_FAILED",
      status: 500,
    });
  }
}

export async function POST(request: Request) {
  const isCron = verifyInternalRequest(request);

  if (!isCron) {
    const auth = await requireAuth(["ADMIN"]);
    if (!auth.ok) return auth.response;

    try {
      return await runSync(request, {
        id: auth.session!.userId,
        name: auth.session!.userName,
      });
    } catch (error) {
      if (error instanceof HrisApiError) {
        return fail(error.message, { code: error.code, status: error.status });
      }
      console.error("[POST /api/internal/hris/sync]", error);
      return fail("Sinkronisasi HRIS gagal", {
        code: "HRIS_SYNC_FAILED",
        status: 500,
      });
    }
  }

  try {
    return await runSync(request);
  } catch (error) {
    if (error instanceof HrisApiError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/internal/hris/sync cron]", error);
    return fail("Sinkronisasi HRIS gagal", {
      code: "HRIS_SYNC_FAILED",
      status: 500,
    });
  }
}

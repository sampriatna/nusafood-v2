import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  internalAuthFailure,
  verifyInternalRequest,
} from "@/lib/internal-auth";
import { HrisApiError } from "@/lib/services/hris-api.client";
import {
  getLastSuccessfulSyncTime,
  previewHrisStaffSync,
  runHrisStaffSync,
} from "@/lib/services/hris-staff-sync.service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type SyncBody = {
  dry_run?: boolean;
  full?: boolean;
  updated_since?: string;
};

async function parseBody(request: Request): Promise<SyncBody> {
  try {
    return (await request.json()) as SyncBody;
  } catch {
    return {};
  }
}

/** Vercel Cron (UTC): incremental sync sejak sync sukses terakhir. */
export async function GET(request: Request) {
  if (!verifyInternalRequest(request)) {
    return internalAuthFailure();
  }

  try {
    const result = await runHrisStaffSync({
      full: false,
      triggeredBy: "cron",
      triggeredByName: "Vercel cron (incremental, UTC)",
    });
    return ok(result);
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
  const body = isCron ? {} : await parseBody(request);

  if (!isCron) {
    const auth = await requireAuth(["ADMIN"]);
    if (!auth.ok) return auth.response;

    try {
      if (body.dry_run) {
        const since =
          body.full === true
            ? undefined
            : (body.updated_since ?? (await getLastSuccessfulSyncTime()));
        const preview = await previewHrisStaffSync({
          full: body.full,
          updatedSince: since,
        });
        return ok({
          dry_run: true as const,
          incremental_since: since ?? null,
          ...preview,
        });
      }

      const result = await runHrisStaffSync({
        full: body.full === true,
        updatedSince: body.updated_since,
        triggeredBy: auth.session!.userId,
        triggeredByName: auth.session!.userName,
      });
      return ok(result);
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
    const result = await runHrisStaffSync({
      full: false,
      triggeredBy: "cron",
      triggeredByName: "Scheduled sync (incremental)",
    });
    return ok(result);
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

import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  DailyActivitySeedError,
  seedDailyActivityTemplates,
} from "@/lib/services/daily-activity-seed.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin: upsert template kegiatan harian + checklist dari seed bawaan. */
export async function POST() {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const result = await seedDailyActivityTemplates();
    return ok(result);
  } catch (error) {
    if (error instanceof DailyActivitySeedError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/staff-reports/templates/seed]", error);
    return fail(
      error instanceof Error ? error.message : "Seed template kegiatan gagal",
      { code: "DAILY_ACTIVITY_SEED_FAILED", status: 500 },
    );
  }
}

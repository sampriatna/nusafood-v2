import type { HealthStatus } from "@nusafood/types";
import { prisma } from "@/lib/db";
import { ok, fail } from "@/lib/api/response";
import { checkGasFallback } from "@/lib/services/gas-adapter.service";
import { checkStorageHealth } from "@/lib/services/storage.service";

export const dynamic = "force-dynamic";

async function checkDatabase(): Promise<HealthStatus["database"]> {
  if (!process.env.DATABASE_URL) {
    return "degraded";
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return "ok";
  } catch {
    return "down";
  }
}

export async function GET() {
  try {
    const [database, storage, gas_fallback] = await Promise.all([
      checkDatabase(),
      checkStorageHealth(),
      checkGasFallback(),
    ]);

    const data: HealthStatus = {
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "2.0.0",
      database,
      storage,
      gas_fallback,
    };

    const healthy =
      database !== "down" &&
      storage !== "down" &&
      gas_fallback !== "down";

    return ok(data, undefined, { status: healthy ? 200 : 503 });
  } catch (error) {
    console.error("[health]", error);
    return fail("Health check gagal", {
      code: "HEALTH_CHECK_FAILED",
      status: 500,
    });
  }
}

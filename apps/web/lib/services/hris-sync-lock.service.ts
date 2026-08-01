import { prisma } from "@/lib/db";
import { HrisApiError } from "@/lib/services/hris-api.client";

const LOCK_ID = "global";
const LOCK_TTL_MS = 30 * 60 * 1000;

export async function acquireHrisSyncLock(
  lockedBy: string,
): Promise<{ acquired: boolean; holder?: string }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_TTL_MS);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.hrisSyncLock.findUnique({ where: { id: LOCK_ID } });
    if (existing && existing.expiresAt > now) {
      return { acquired: false, holder: existing.lockedBy };
    }

    await tx.hrisSyncLock.upsert({
      where: { id: LOCK_ID },
      create: { id: LOCK_ID, lockedBy, lockedAt: now, expiresAt },
      update: { lockedBy, lockedAt: now, expiresAt },
    });

    return { acquired: true };
  });
}

export async function releaseHrisSyncLock(): Promise<void> {
  await prisma.hrisSyncLock.deleteMany({ where: { id: LOCK_ID } });
}

export async function assertHrisSyncNotLocked(): Promise<void> {
  const lock = await prisma.hrisSyncLock.findUnique({ where: { id: LOCK_ID } });
  if (lock && lock.expiresAt > new Date()) {
    throw new HrisApiError(
      "Sinkronisasi HRIS sedang berjalan",
      "HRIS_SYNC_IN_PROGRESS",
      409,
    );
  }
}

export { LOCK_ID, LOCK_TTL_MS };

import { importJWK, SignJWT, type JWK } from "jose";
import { prisma } from "@/lib/db";

const PUSH_TABLE = "staff_push_subscriptions";

export type PushSubscriptionInput = {
  endpoint: string;
  expirationTime?: number | null;
};

export function getWebPushPublicKey(): string | null {
  return process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim() || null;
}

function getVapidConfig() {
  const publicKey = getWebPushPublicKey();
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim() || null;
  const subject =
    process.env.WEB_PUSH_VAPID_SUBJECT?.trim() || "https://tugas.nf3.company";

  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

function rawPublicKeyToJwk(publicKey: string, privateKey: string): JWK {
  const raw = Buffer.from(publicKey, "base64url");
  if (raw.length !== 65 || raw[0] !== 4) {
    throw new Error("WEB_PUSH_VAPID_PUBLIC_KEY harus P-256 uncompressed 65-byte base64url");
  }

  return {
    kty: "EC",
    crv: "P-256",
    x: raw.subarray(1, 33).toString("base64url"),
    y: raw.subarray(33, 65).toString("base64url"),
    d: privateKey,
  };
}

async function buildVapidAuthorization(endpoint: string) {
  const config = getVapidConfig();
  if (!config) return null;

  const audience = new URL(endpoint).origin;
  const key = await importJWK(
    rawPublicKeyToJwk(config.publicKey, config.privateKey),
    "ES256",
  );
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", typ: "JWT" })
    .setAudience(audience)
    .setSubject(config.subject)
    .setExpirationTime(Math.floor(Date.now() / 1000) + 12 * 60 * 60)
    .sign(key);

  return `vapid t=${token}, k=${config.publicKey}`;
}

export async function ensurePushSubscriptionsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${PUSH_TABLE}" (
      "endpoint" TEXT PRIMARY KEY,
      "staff_id" VARCHAR(50) NOT NULL REFERENCES "staff"("staff_id") ON DELETE CASCADE,
      "report_token" TEXT NOT NULL,
      "user_agent" TEXT,
      "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "staff_push_subscriptions_staff_idx"
    ON "${PUSH_TABLE}" ("staff_id", "enabled")
  `);
}

export async function saveStaffPushSubscription(input: {
  staffId: string;
  reportToken: string;
  endpoint: string;
  userAgent?: string | null;
}) {
  if (!/^https:\/\//i.test(input.endpoint)) {
    throw new Error("Push endpoint tidak valid");
  }
  await ensurePushSubscriptionsTable();
  await prisma.$executeRaw`
    INSERT INTO "staff_push_subscriptions"
      ("endpoint", "staff_id", "report_token", "user_agent", "enabled", "updated_at")
    VALUES
      (${input.endpoint}, ${input.staffId}, ${input.reportToken}, ${input.userAgent ?? null}, TRUE, NOW())
    ON CONFLICT ("endpoint") DO UPDATE SET
      "staff_id" = EXCLUDED."staff_id",
      "report_token" = EXCLUDED."report_token",
      "user_agent" = EXCLUDED."user_agent",
      "enabled" = TRUE,
      "updated_at" = NOW()
  `;
}

type SubscriptionRow = { endpoint: string };

async function disableSubscription(endpoint: string) {
  await prisma.$executeRaw`
    UPDATE "staff_push_subscriptions"
    SET "enabled" = FALSE, "updated_at" = NOW()
    WHERE "endpoint" = ${endpoint}
  `;
}

/**
 * Kirim push kosong. Detail tugas diambil service worker dari /api/push/latest,
 * sehingga judul/link tugas tidak dikirim ke push provider.
 */
export async function sendWebPushToStaff(staffId?: string | null): Promise<{
  attempted: number;
  sent: number;
  configured: boolean;
}> {
  if (!staffId || !getVapidConfig()) {
    return { attempted: 0, sent: 0, configured: Boolean(getVapidConfig()) };
  }

  try {
    await ensurePushSubscriptionsTable();
    const subscriptions = await prisma.$queryRaw<SubscriptionRow[]>`
      SELECT "endpoint"
      FROM "staff_push_subscriptions"
      WHERE "staff_id" = ${staffId} AND "enabled" = TRUE
    `;

    let sent = 0;
    for (const subscription of subscriptions) {
      try {
        const authorization = await buildVapidAuthorization(subscription.endpoint);
        if (!authorization) continue;
        const response = await fetch(subscription.endpoint, {
          method: "POST",
          headers: {
            TTL: "120",
            Urgency: "high",
            Authorization: authorization,
          },
          body: null,
        });
        if (response.ok) {
          sent += 1;
        } else if (response.status === 404 || response.status === 410) {
          await disableSubscription(subscription.endpoint);
        } else {
          console.warn("[web-push] provider rejected", response.status, staffId);
        }
      } catch (error) {
        console.warn("[web-push] send failed", staffId, error);
      }
    }

    return { attempted: subscriptions.length, sent, configured: true };
  } catch (error) {
    // Push tidak boleh menggagalkan pembuatan task.
    console.error("[web-push] staff notification failed", staffId, error);
    return { attempted: 0, sent: 0, configured: true };
  }
}

import { ok } from "@/lib/api/response";
import { getWebPushPublicKey } from "@/lib/services/web-push.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const publicKey = getWebPushPublicKey();
  return ok({
    enabled: Boolean(publicKey && process.env.WEB_PUSH_VAPID_PRIVATE_KEY),
    public_key: publicKey,
  });
}

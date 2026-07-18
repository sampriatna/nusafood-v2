import { fail } from "@/lib/api/response";
import { NextResponse } from "next/server";

/** Cron (Bearer CRON_SECRET) atau x-internal-key === ADMIN_API_KEY */
export function verifyInternalRequest(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (cronSecret && auth === `Bearer ${cronSecret}`) {
    return true;
  }

  const expected = process.env.ADMIN_API_KEY;
  if (expected && !expected.includes("your-gas")) {
    const provided = request.headers.get("x-internal-key");
    if (provided === expected) return true;
  }

  return false;
}

export function internalAuthFailure(): NextResponse {
  return fail("Akses ditolak", { code: "FORBIDDEN", status: 403 });
}

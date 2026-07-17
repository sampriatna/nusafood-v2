import { NextResponse } from "next/server"
import type { StaffRole } from "@nusafood/types"
import {
  authRequired,
  getSession,
  roleAllowed,
  type SessionPayload,
} from "@/lib/auth"
import { fail } from "@/lib/api/response"

export type AuthResult =
  | { ok: true; session: SessionPayload | null }
  | { ok: false; response: NextResponse }

export async function requireAuth(roles?: StaffRole[]): Promise<AuthResult> {
  if (!authRequired()) {
    return { ok: true, session: await getSession() }
  }

  const session = await getSession()
  if (!session) {
    return {
      ok: false,
      response: fail("Unauthorized", { code: "UNAUTHORIZED", status: 401 }),
    }
  }

  if (roles?.length && !roleAllowed(session, roles)) {
    return {
      ok: false,
      response: fail("Forbidden", { code: "FORBIDDEN", status: 403 }),
    }
  }

  return { ok: true, session }
}

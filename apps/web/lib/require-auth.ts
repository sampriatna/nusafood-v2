import { NextResponse } from "next/server"
import type { StaffRole } from "@nusafood/types"
import {
  authRequired,
  getSession,
  roleAllowed,
  type SessionPayload,
} from "@/lib/auth"
import { fail } from "@/lib/api/response"
import {
  canAccessAdminDashboard,
  canManageSystemSettings,
  canManageUsers,
  isOwner,
  ownerOrAdminDeniedMessage,
} from "@/lib/permissions"

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

  if (roles?.length && !roleAllowed(session, roles) && !isOwner(session)) {
    return {
      ok: false,
      response: fail("Forbidden", { code: "FORBIDDEN", status: 403 }),
    }
  }

  return { ok: true, session }
}

/** Wajib login; owner selalu lolos meski role list tidak memuat ADMIN. */
export async function requireOwner(): Promise<AuthResult> {
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
  if (!isOwner(session)) {
    return {
      ok: false,
      response: fail(ownerOrAdminDeniedMessage(), {
        code: "OWNER_REQUIRED",
        status: 403,
      }),
    }
  }
  return { ok: true, session }
}

export async function requireAdminOrOwner(): Promise<AuthResult> {
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
  if (!canManageSystemSettings(session)) {
    return {
      ok: false,
      response: fail(ownerOrAdminDeniedMessage(), {
        code: "FORBIDDEN",
        status: 403,
      }),
    }
  }
  return { ok: true, session }
}

export async function requireDashboardAccess(): Promise<AuthResult> {
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
  if (!canAccessAdminDashboard(session)) {
    return {
      ok: false,
      response: fail("Akses ditolak. Staff tidak boleh masuk dashboard admin.", {
        code: "FORBIDDEN",
        status: 403,
      }),
    }
  }
  return { ok: true, session }
}

export async function requireUserManagement(): Promise<AuthResult> {
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
  if (!canManageUsers(session)) {
    return {
      ok: false,
      response: fail(ownerOrAdminDeniedMessage(), {
        code: "FORBIDDEN",
        status: 403,
      }),
    }
  }
  return { ok: true, session }
}

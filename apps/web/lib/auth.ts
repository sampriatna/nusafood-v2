import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { StaffRole } from "@nusafood/types";
import { resolveIsOwner } from "@/lib/owner";

export const SESSION_COOKIE_NAME = "nusa_session";
/** Alias untuk kompatibilitas route handlers */
export const SESSION_COOKIE = SESSION_COOKIE_NAME;

function sessionDurationSeconds() {
  const raw = process.env.JWT_EXPIRES_IN || "7d";
  if (raw.endsWith("d")) {
    return Number(raw.slice(0, -1) || 7) * 24 * 60 * 60;
  }
  if (raw.endsWith("h")) {
    return Number(raw.slice(0, -1) || 24) * 60 * 60;
  }
  return 60 * 60 * 24 * 7;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.includes("generate-random")) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  isAdmin: boolean;
  /** Session-level owner flag — bukan enum DB StaffRole. */
  isOwner: boolean;
  loginAt: number;
  expiresAt: number;
  userId: string;
  userName: string;
  userRole: StaffRole;
  userOutlet?: string;
  userOutletId?: string;
  staffId?: string;
  username?: string;
}

export async function createSessionToken(
  payload: Omit<
    SessionPayload,
    "isAdmin" | "isOwner" | "loginAt" | "expiresAt"
  > & {
    isAdmin?: boolean;
    isOwner?: boolean;
    username?: string;
  },
): Promise<string> {
  const duration = sessionDurationSeconds();
  const expiresAt = Date.now() + duration * 1000;
  const isOwner =
    payload.isOwner ??
    resolveIsOwner({
      userId: payload.userId,
      username: payload.username,
    });

  const full: SessionPayload = {
    isAdmin:
      payload.isAdmin ??
      (isOwner || ["ADMIN", "LEADER"].includes(payload.userRole)),
    isOwner,
    loginAt: Date.now(),
    expiresAt,
    userId: payload.userId,
    userName: payload.userName,
    userRole: payload.userRole,
    userOutlet: payload.userOutlet,
    userOutletId: payload.userOutletId,
    staffId: payload.staffId,
    username: payload.username,
  };

  return new SignJWT({ ...full })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt / 1000))
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.isAdmin !== "boolean" ||
      typeof payload.expiresAt !== "number" ||
      typeof payload.userId !== "string" ||
      typeof payload.userRole !== "string"
    ) {
      return null;
    }
    if ((payload.expiresAt as number) < Date.now()) return null;

    const userId = payload.userId as string;
    const username =
      typeof payload.username === "string" ? payload.username : undefined;
    const isOwner =
      typeof payload.isOwner === "boolean"
        ? payload.isOwner
        : resolveIsOwner({ userId, username });

    return {
      isAdmin: payload.isAdmin as boolean,
      isOwner,
      loginAt: Number(payload.loginAt ?? Date.now()),
      expiresAt: payload.expiresAt as number,
      userId,
      userName: String(payload.userName ?? ""),
      userRole: payload.userRole as StaffRole,
      userOutlet: payload.userOutlet as string | undefined,
      userOutletId: payload.userOutletId as string | undefined,
      staffId: payload.staffId as string | undefined,
      username,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!value) return null;
  return verifySessionToken(value);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionDurationSeconds(),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function authRequired(): boolean {
  // Default ON for Sprint 6; set AUTH_REQUIRED=false for open staging/dev
  if (process.env.AUTH_REQUIRED === "false") return false;
  return true;
}

export function validateAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  return password === adminPassword;
}

export function roleAllowed(
  session: SessionPayload,
  roles?: StaffRole[],
): boolean {
  if (!roles || roles.length === 0) return true;
  return roles.includes(session.userRole);
}

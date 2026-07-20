import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"
import {
  buildV1FallbackUrl,
  emergencyFallbackEnabled,
  isStaffSurfacePath,
} from "@/lib/emergency-fallback"

const SESSION_COOKIE = "nusa_session"

const PUBLIC_PATHS = [
  "/login",
  "/report",
  "/checklist",
  "/r",
  "/api/health",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/uploads/photo",
  "/uploads",
]

function isPublicPath(pathname: string) {
  if (pathname === "/") return true
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )
}

function isPublicTaskApi(pathname: string) {
  return (
    Boolean(pathname.match(/^\/api\/tasks\/[^/]+\/public/)) ||
    Boolean(pathname.match(/^\/api\/tasks\/[^/]+\/open/)) ||
    Boolean(pathname.match(/^\/api\/tasks\/[^/]+\/submit/)) ||
    Boolean(pathname.match(/^\/api\/checklist-reports\/[^/]+\/public/)) ||
    Boolean(pathname.match(/^\/api\/checklist-reports\/[^/]+\/submit/)) ||
    Boolean(pathname.match(/^\/api\/staff-reports\/by-token\//)) ||
    pathname === "/api/staff-reports/submit"
  )
}

function isInternalAuthorized(request: NextRequest, pathname: string): boolean {
  if (pathname !== "/api/internal/recurring/generate") return false;
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  const expected = process.env.ADMIN_API_KEY;
  if (expected && !expected.includes("your-gas")) {
    const provided = request.headers.get("x-internal-key");
    if (provided === expected) return true;
  }
  return false;
}

function authRequired() {
  return process.env.AUTH_REQUIRED !== "false"
}

function getSecretKey(): Uint8Array | null {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.includes("generate-random")) return null
  return new TextEncoder().encode(secret)
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return false
  const key = getSecretKey()
  if (!key) return Boolean(token)
  try {
    const { payload } = await jwtVerify(token, key)
    if (typeof payload.expiresAt === "number" && payload.expiresAt < Date.now()) {
      return false
    }
    return true
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Level-2 rollback: staff surfaces → v1 (lihat V2_ROLLBACK_PLAN.md)
  if (emergencyFallbackEnabled() && isStaffSurfacePath(pathname)) {
    const target = buildV1FallbackUrl(pathname, request.nextUrl.search)
    if (target) {
      return NextResponse.redirect(target, 302)
    }
  }

  if (isPublicPath(pathname) || isPublicTaskApi(pathname)) {
    return NextResponse.next()
  }

  // /api/auth/me selalu boleh dipanggil (balik 401 jika belum login)
  if (pathname === "/api/auth/me") {
    return NextResponse.next()
  }

  if (!authRequired()) {
    return NextResponse.next()
  }

  const valid = await hasValidSession(request)

  const protectedUi =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/tasks") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/teguran") ||
    pathname.startsWith("/disciplinary") ||
    pathname.startsWith("/recurring") ||
    pathname.startsWith("/checklist-template") ||
    pathname.startsWith("/admin")

  if (protectedUi && !valid) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (pathname.startsWith("/api/") && !valid) {
    if (isInternalAuthorized(request, pathname)) {
      return NextResponse.next();
    }
    return NextResponse.json(
      { success: false, data: null, error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

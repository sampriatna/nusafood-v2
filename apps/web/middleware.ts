import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/report",
  "/checklist",
  "/api/health",
  "/api/auth/login",
];

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public staff/auth/health routes — no session required
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // API public task token routes
  if (
    pathname.match(/^\/api\/tasks\/[^/]+\/public/) ||
    pathname.match(/^\/api\/checklist-reports\/[^/]+\/public/)
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get("nusa_session");

  // Admin UI routes require session cookie (auth implementation in Sprint 6)
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/tasks") || pathname.startsWith("/settings") || pathname.startsWith("/recurring") || pathname.startsWith("/checklist-template")) {
    if (!session?.value) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

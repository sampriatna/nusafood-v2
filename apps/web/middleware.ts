import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/report",
  "/checklist",
  "/api/health",
  "/api/auth/login",
  "/api/uploads/photo",
  "/uploads",
];

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function isPublicTaskApi(pathname: string) {
  return (
    Boolean(pathname.match(/^\/api\/tasks\/[^/]+\/public/)) ||
    Boolean(pathname.match(/^\/api\/tasks\/[^/]+\/open/)) ||
    Boolean(pathname.match(/^\/api\/tasks\/[^/]+\/submit/)) ||
    Boolean(pathname.match(/^\/api\/checklist-reports\/[^/]+\/public/))
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname) || isPublicTaskApi(pathname)) {
    return NextResponse.next();
  }

  // Sprint 2–4: admin UI/API terbuka tanpa session untuk uji staging.
  // Set AUTH_REQUIRED=true mulai Sprint 6.
  if (process.env.AUTH_REQUIRED !== "true") {
    return NextResponse.next();
  }

  const session = request.cookies.get("nusa_session");
  const protectedUi =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/tasks") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/recurring") ||
    pathname.startsWith("/checklist-template");

  if (protectedUi && !session?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

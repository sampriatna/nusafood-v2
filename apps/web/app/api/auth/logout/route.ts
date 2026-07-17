import { SESSION_COOKIE_NAME } from "@/lib/auth"
import { ok } from "@/lib/api/response"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  const response = ok({ ok: true })
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
  return response
}

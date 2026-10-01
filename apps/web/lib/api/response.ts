import { NextResponse } from "next/server";
import type { ApiMeta } from "@nusafood/types";

export function ok<T>(data: T, meta?: ApiMeta, init?: ResponseInit) {
  return NextResponse.json(
    {
      success: true,
      data,
      error: null,
      ...(meta ? { meta } : {}),
    },
    init,
  );
}

export function fail(
  error: string,
  options?: { code?: string; status?: number },
) {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error,
      ...(options?.code ? { code: options.code } : {}),
    },
    { status: options?.status ?? 400 },
  );
}

/**
 * Pesan error yang aman dikirim ke browser: pesan validasi aplikasi diteruskan,
 * error database/Prisma (berisi nama tabel & query) diganti pesan umum.
 */
export function publicErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const internal =
    error.name.startsWith("PrismaClient") ||
    /prisma|invocation|\n|ECONN|ETIMEDOUT|relation |column /i.test(error.message);
  if (internal) {
    console.error("[api error]", error);
    return fallback;
  }
  return error.message.slice(0, 300);
}

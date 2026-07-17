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

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { fail } from "@/lib/api/response";
import {
  DisciplinaryError,
  getDisciplinaryLetter,
} from "@/lib/services/disciplinary.service";
import { buildFormalLetterHtml } from "@/lib/services/disciplinary-pdf.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Formal printable letter HTML (use browser Print → Save as PDF). */
export async function GET(request: Request, { params }: Params) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const letter = await getDisciplinaryLetter(id);
    if (!letter) {
      return fail("Surat tidak ditemukan.", { code: "NOT_FOUND", status: 404 });
    }
    const origin = new URL(request.url).origin;
    const html = buildFormalLetterHtml(letter, origin);
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof DisciplinaryError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[GET /api/disciplinary/:id/document]", error);
    return fail("Gagal membuat dokumen surat", { status: 500 });
  }
}

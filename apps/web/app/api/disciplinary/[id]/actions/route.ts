import { fail, ok } from "@/lib/api/response";
import { requireAuth } from "@/lib/require-auth";
import {
  DisciplinaryError,
  acknowledgeLetter,
  approveLetter,
  cancelLetter,
  generatePdf,
  resolveLetter,
  sendLetter,
  submitForApproval,
} from "@/lib/services/disciplinary.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

type ActionBody = {
  action:
    | "submit_approval"
    | "approve"
    | "send"
    | "generate_pdf"
    | "acknowledge"
    | "resolve"
    | "cancel";
  note?: string;
};

export async function POST(request: Request, { params }: Params) {
  const auth = await requireAuth(["ADMIN", "LEADER"]);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = (await request.json()) as ActionBody;
    const origin = new URL(request.url).origin;

    switch (body.action) {
      case "submit_approval":
        return ok(await submitForApproval(id, auth.session));
      case "approve":
        return ok(await approveLetter(id, auth.session));
      case "send":
        return ok(await sendLetter(id, auth.session));
      case "generate_pdf":
        return ok(await generatePdf(id, auth.session, origin));
      case "acknowledge":
        return ok(await acknowledgeLetter(id, auth.session));
      case "resolve":
        return ok(await resolveLetter(id, auth.session));
      case "cancel":
        return ok(await cancelLetter(id, auth.session, body.note));
      default:
        return fail("Aksi tidak dikenal.", { code: "INVALID_ACTION", status: 400 });
    }
  } catch (error) {
    if (error instanceof DisciplinaryError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[POST /api/disciplinary/:id/actions]", error);
    return fail("Gagal memproses aksi surat", { status: 500 });
  }
}

import { fail, publicErrorMessage } from "@/lib/api/response";
import { ProjectError } from "@/lib/project-errors";
import { OWNER_ACTOR } from "@/lib/services/project.service";
import type { AuthResult } from "@/lib/require-auth";

/** Error domain Project → respons JSON dengan status yang benar; error lain disamarkan. */
export function projectFail(error: unknown, fallback: string) {
  if (error instanceof ProjectError) {
    return fail(error.message, { code: error.code, status: error.status });
  }
  return fail(publicErrorMessage(error, fallback), { status: 500 });
}

export function actorFromAuth(auth: Extract<AuthResult, { ok: true }>) {
  return OWNER_ACTOR(auth.session?.userName || "Owner/Leader", auth.session?.userId || null);
}

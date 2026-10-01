import { fail, ok } from "@/lib/api/response";
import {
  getProjectPicView,
  ProjectPicError,
} from "@/lib/services/project-pic.service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    return ok(await getProjectPicView(token));
  } catch (error) {
    if (error instanceof ProjectPicError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    return fail("Gagal memuat project", {
      code: "PROJECT_PIC_LOAD_FAILED",
      status: 500,
    });
  }
}

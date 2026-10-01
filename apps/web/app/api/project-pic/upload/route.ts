import { fail, ok, publicErrorMessage } from "@/lib/api/response";
import {
  assertProjectPicStepAccess,
  ProjectPicError,
  updateProjectPicStep,
} from "@/lib/services/project-pic.service";
import { uploadPhoto } from "@/lib/services/storage.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const token = String(form.get("token") || "").trim();
    const stepId = String(form.get("step_id") || "").trim();

    if (!token) return fail("Token project tidak valid", { status: 403 });
    if (!stepId) return fail("Langkah checklist tidak ditemukan", { status: 400 });
    if (!(file instanceof File)) {
      return fail("Foto bukti wajib diupload", {
        code: "PHOTO_REQUIRED",
        status: 422,
      });
    }

    await assertProjectPicStepAccess(token, stepId);

    if (file.size > MAX_BYTES) {
      return fail("Ukuran foto melebihi batas 10MB", {
        code: "PHOTO_TOO_LARGE",
        status: 413,
      });
    }

    const contentType = file.type || "image/jpeg";
    if (!ALLOWED.has(contentType) && !contentType.startsWith("image/")) {
      return fail("Format foto harus JPEG, PNG, atau WebP", {
        code: "PHOTO_INVALID_TYPE",
        status: 422,
      });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await uploadPhoto({
      bytes,
      contentType: ALLOWED.has(contentType) ? contentType : "image/jpeg",
      taskId: `project-${stepId}`,
      context: "checklist_item",
      originalName: file.name,
    });

    await updateProjectPicStep(token, stepId, {
      evidence_url: result.url,
    });

    return ok({
      url: result.url,
      size_bytes: result.size_bytes,
      storage: result.storage,
    });
  } catch (error) {
    if (error instanceof ProjectPicError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    return fail(
      publicErrorMessage(error, "Gagal upload bukti"),
      { code: "PROJECT_EVIDENCE_UPLOAD_FAILED", status: 500 },
    );
  }
}

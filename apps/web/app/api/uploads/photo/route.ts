import { fail, ok } from "@/lib/api/response";
import { prisma } from "@/lib/db";
import {
  uploadPhoto,
  type UploadContext,
} from "@/lib/services/storage.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const context = String(form.get("context") || "after") as UploadContext;
    const taskId = String(form.get("task_id") || "");
    const token = String(form.get("token") || "");

    if (!(file instanceof File)) {
      return fail("File foto wajib diupload", {
        code: "PHOTO_REQUIRED",
        status: 422,
      });
    }

    if (!taskId) {
      return fail("task_id wajib diisi", {
        code: "VALIDATION_ERROR",
        status: 400,
      });
    }

    if (!["before", "after", "checklist_item"].includes(context)) {
      return fail("context tidak valid", {
        code: "VALIDATION_ERROR",
        status: 400,
      });
    }

    // Staff uploads require valid task token; before (admin) may omit when AUTH off
    if (context !== "before") {
      if (!token) {
        return fail("Token tidak valid", {
          code: "INVALID_TOKEN",
          status: 403,
        });
      }
      const task = await prisma.task.findFirst({
        where: { taskId, token },
        select: { id: true },
      });
      if (!task) {
        return fail("Tugas tidak ditemukan atau token salah", {
          code: "TASK_NOT_FOUND",
          status: 404,
        });
      }
    }

    if (file.size > MAX_BYTES) {
      return fail("Ukuran foto melebihi batas (10MB)", {
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
      taskId,
      context,
      originalName: file.name,
    });

    return ok({
      url: result.url,
      size_bytes: result.size_bytes,
      storage: result.storage,
      width: null,
      height: null,
    });
  } catch (error) {
    console.error("[POST /api/uploads/photo]", error);
    return fail(
      error instanceof Error ? error.message : "Gagal upload foto",
      { code: "PHOTO_UPLOAD_FAILED", status: 500 },
    );
  }
}

import { fail, ok } from "@/lib/api/response";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-auth";
import {
  DailyActivityError,
  assertDailyReportUploadToken,
} from "@/lib/services/daily-activity.service";
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

    if (
      ![
        "before",
        "after",
        "checklist_item",
        "daily_report",
        "disciplinary",
      ].includes(context)
    ) {
      return fail("context tidak valid", {
        code: "VALIDATION_ERROR",
        status: 400,
      });
    }

    // Disciplinary evidence: admin/leader session, no task token required
    if (context === "disciplinary") {
      const auth = await requireAuth(["ADMIN", "LEADER"]);
      if (!auth.ok) return auth.response;
    } else if (!taskId) {
      return fail("task_id wajib diisi", {
        code: "VALIDATION_ERROR",
        status: 400,
      });
    }

    // Staff uploads require valid token; before (admin) may omit when AUTH off
    if (context === "daily_report") {
      if (!token) {
        return fail("Token tidak valid", {
          code: "INVALID_TOKEN",
          status: 403,
        });
      }
      try {
        await assertDailyReportUploadToken(taskId, token);
      } catch (error) {
        if (error instanceof DailyActivityError) {
          return fail(error.message, {
            code: error.code,
            status: error.status,
          });
        }
        throw error;
      }
    } else if (context !== "before" && context !== "disciplinary") {
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

    const storageKey =
      context === "disciplinary"
        ? taskId || `teguran-${Date.now()}`
        : taskId;

    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await uploadPhoto({
      bytes,
      contentType: ALLOWED.has(contentType) ? contentType : "image/jpeg",
      taskId: storageKey,
      context,
      originalName: file.name,
    });

    let outletId: string | undefined;
    if (context !== "daily_report" && context !== "disciplinary") {
      const taskMeta = await prisma.task.findUnique({
        where: { taskId },
        select: { outletId: true },
      });
      outletId = taskMeta?.outletId;

      if (context === "before") {
        await prisma.task.update({
          where: { taskId },
          data: { beforePhotoUrl: result.url },
        });
      }
    }

    const { logSyncOperation } = await import("@/lib/services/dual-write.service");
    await logSyncOperation({
      operation: "upload_photo",
      entityType:
        context === "daily_report"
          ? "daily_report"
          : context === "disciplinary"
            ? "disciplinary"
            : "task",
      entityId: storageKey,
      taskId:
        context === "daily_report" || context === "disciplinary"
          ? undefined
          : taskId,
      outletId,
      v2Status: "success",
      v2Response: {
        context,
        storage: result.storage,
        size_bytes: result.size_bytes,
      },
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
    const { logSyncOperation } = await import("@/lib/services/dual-write.service");
    await logSyncOperation({
      operation: "upload_photo",
      entityType: "task",
      v2Status: "failed",
      errorMessage:
        error instanceof Error ? error.message : "Gagal upload foto",
    }).catch(() => undefined);
    return fail(
      error instanceof Error ? error.message : "Gagal upload foto",
      { code: "PHOTO_UPLOAD_FAILED", status: 500 },
    );
  }
}

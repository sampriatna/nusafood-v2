import type { TaskPriority } from "@nusafood/database";
import type { CreateTaskPayload, Task } from "@nusafood/types";
import {
  normalizeOutletCode,
  normalizePriority,
  normalizeStatus,
  asString,
  parseDate,
} from "@nusafood/database/normalizers";
import { prisma } from "@/lib/db";
import { buildReportLink, generateTaskId, generateToken } from "@/lib/id";
import { mapTaskToApi } from "@/lib/mappers/task";
import {
  callGasAction,
  isGasEnabled,
} from "@/lib/services/gas-adapter.service";
import {
  dualWriteEnabled,
  dualWritePrimary,
  logSyncOperation,
  writeAuditLog,
} from "@/lib/services/dual-write.service";

export class TaskWriteError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function resolveRelations(payload: CreateTaskPayload) {
  const outletCode = normalizeOutletCode(payload.outlet);
  const outlet = await prisma.outlet.findUnique({ where: { code: outletCode } });
  if (!outlet) {
    throw new TaskWriteError(
      `Outlet tidak ditemukan: ${payload.outlet}`,
      "OUTLET_NOT_FOUND",
      422,
    );
  }

  let areaId: string | null = null;
  let areaName: string | null = asString(payload.area) || null;
  if (areaName) {
    const area = await prisma.area.upsert({
      where: { outletId_name: { outletId: outlet.id, name: areaName } },
      create: { outletId: outlet.id, name: areaName },
      update: { isActive: true },
    });
    areaId = area.id;
    areaName = area.name;
  }

  let categoryId: string | null = null;
  let categoryName: string | null = asString(payload.category) || null;
  if (categoryName) {
    const category = await prisma.category.upsert({
      where: { name: categoryName },
      create: { name: categoryName },
      update: { isActive: true },
    });
    categoryId = category.id;
    categoryName = category.name;
  }

  return { outlet, areaId, areaName, categoryId, categoryName };
}

function validateCreatePayload(payload: CreateTaskPayload) {
  if (!payload.task_title?.trim()) {
    throw new TaskWriteError("Judul tugas wajib diisi", "VALIDATION_ERROR");
  }
  if (!payload.pic_name?.trim() || !payload.pic_wa?.trim()) {
    throw new TaskWriteError("PIC dan nomor WA wajib diisi", "VALIDATION_ERROR");
  }
  if (!payload.deadline || !parseDate(payload.deadline)) {
    throw new TaskWriteError("Deadline tidak valid", "VALIDATION_ERROR");
  }
  if (!payload.outlet) {
    throw new TaskWriteError("Outlet wajib diisi", "VALIDATION_ERROR");
  }
}

async function insertTaskToDb(input: {
  taskId: string;
  token: string;
  payload: CreateTaskPayload;
  createdBy?: string;
  status?: string;
  reportLink?: string;
  sourceVersion?: string;
}) {
  const { outlet, areaId, areaName, categoryId, categoryName } =
    await resolveRelations(input.payload);
  const deadline = parseDate(input.payload.deadline)!;
  const reportLink =
    input.reportLink ?? buildReportLink(input.taskId, input.token);

  const row = await prisma.task.create({
    data: {
      taskId: input.taskId,
      token: input.token,
      createdBy: input.createdBy ?? "v2-admin",
      outletId: outlet.id,
      areaId,
      categoryId,
      outletName: outlet.name,
      areaName,
      categoryName,
      taskTitle: input.payload.task_title.trim(),
      taskDescription: input.payload.task_description?.trim() || null,
      priority: normalizePriority(input.payload.priority) as TaskPriority,
      picName: input.payload.pic_name.trim(),
      picWa: input.payload.pic_wa.trim(),
      deadline,
      beforePhotoUrl: input.payload.before_photo_url ?? null,
      status: normalizeStatus(input.status ?? "OPEN"),
      reportLink,
      sourceVersion: input.sourceVersion ?? "v2",
      gasSyncedAt: input.sourceVersion === "v1" ? new Date() : null,
    },
  });

  return row;
}

/**
 * Buat tugas dengan dual-write sesuai env:
 * - DUAL_WRITE_ENABLED + primary=gas → GAS dulu, lalu DB (rollback DB n/a; hapus jika DB gagal setelah GAS ok dicatat di sync_logs)
 * - primary=db atau GAS off → DB saja (generate task_id/token lokal)
 */
export async function createTask(
  payload: CreateTaskPayload,
  options?: { createdBy?: string },
): Promise<Task> {
  validateCreatePayload(payload);

  const useDualWrite = dualWriteEnabled();
  const primary = dualWritePrimary();
  const gasOn = isGasEnabled();

  // Path A: GAS primary (fase 2 migrasi)
  if (useDualWrite && primary === "gas" && gasOn) {
    const gas = await callGasAction<Record<string, unknown>>(
      "createTask",
      payload as unknown as Record<string, unknown>,
    );

    if (!gas.success || !gas.data) {
      await logSyncOperation({
        operation: "create_task",
        entityType: "task",
        v1Status: "failed",
        v2Status: null,
        v1Response: gas.raw ?? { error: gas.error },
        errorMessage: gas.error ?? "GAS createTask gagal",
      });
      throw new TaskWriteError(
        gas.error ?? "Gagal membuat tugas di sistem lama (GAS)",
        "GAS_CREATE_FAILED",
        502,
      );
    }

    const taskId = asString(gas.data.task_id ?? gas.data.taskId);
    const token = asString(gas.data.token);
    if (!taskId || !token) {
      await logSyncOperation({
        operation: "create_task",
        entityType: "task",
        v1Status: "partial",
        v2Status: "failed",
        v1Response: gas.raw,
        errorMessage: "GAS sukses tapi task_id/token kosong",
      });
      throw new TaskWriteError(
        "Respons GAS tidak lengkap (task_id/token)",
        "GAS_INVALID_RESPONSE",
        502,
      );
    }

    try {
      const row = await insertTaskToDb({
        taskId,
        token,
        payload: {
          ...payload,
          task_title: asString(gas.data.task_title) || payload.task_title,
          task_description:
            asString(gas.data.task_description) || payload.task_description,
        },
        createdBy:
          asString(gas.data.created_by) || options?.createdBy || "v2-admin",
        status: asString(gas.data.status) || "OPEN",
        reportLink:
          asString(gas.data.report_link) || buildReportLink(taskId, token),
        sourceVersion: "v2",
      });

      // Mark gas sync timestamp
      await prisma.task.update({
        where: { id: row.id },
        data: { gasSyncedAt: new Date() },
      });

      await logSyncOperation({
        operation: "create_task",
        entityType: "task",
        entityId: taskId,
        v1Status: "success",
        v2Status: "success",
        v1Response: gas.raw,
        v2Response: { task_id: taskId },
      });

      await writeAuditLog({
        entityType: "task",
        entityId: taskId,
        action: "created",
        actorType: "leader",
        actorName: options?.createdBy ?? "v2-admin",
        newValue: { task_id: taskId, dual_write: true, primary: "gas" },
      });

      const refreshed = await prisma.task.findUniqueOrThrow({
        where: { taskId },
      });
      return mapTaskToApi(refreshed);
    } catch (error) {
      await logSyncOperation({
        operation: "create_task",
        entityType: "task",
        entityId: taskId,
        v1Status: "success",
        v2Status: "failed",
        v1Response: gas.raw,
        errorMessage:
          error instanceof Error ? error.message : "DB insert gagal setelah GAS",
      });
      throw new TaskWriteError(
        "Tugas terbuat di GAS tetapi gagal disimpan ke database v2",
        "DUAL_WRITE_FAILED",
        500,
      );
    }
  }

  // Path B: DB primary / dual-write ke GAS opsional / GAS tidak tersedia
  const taskId = generateTaskId();
  const token = generateToken(32);
  const row = await insertTaskToDb({
    taskId,
    token,
    payload,
    createdBy: options?.createdBy,
    status: "OPEN",
    sourceVersion: "v2",
  });

  let v1Status: "success" | "failed" | "partial" | null = null;
  let v1Response: unknown = null;
  let gasError: string | null = null;

  if (useDualWrite && gasOn) {
    const gas = await callGasAction<Record<string, unknown>>("createTask", {
      ...(payload as unknown as Record<string, unknown>),
      task_id: taskId,
      token,
    });
    v1Response = gas.raw ?? { error: gas.error };
    if (gas.success) {
      v1Status = "success";
      await prisma.task.update({
        where: { id: row.id },
        data: { gasSyncedAt: new Date() },
      });
    } else {
      v1Status = "failed";
      gasError = gas.error ?? "GAS createTask gagal";
    }
  }

  await logSyncOperation({
    operation: "create_task",
    entityType: "task",
    entityId: taskId,
    v1Status,
    v2Status: "success",
    v1Response,
    v2Response: { task_id: taskId },
    errorMessage: gasError,
  });

  await writeAuditLog({
    entityType: "task",
    entityId: taskId,
    action: "created",
    actorType: "leader",
    actorName: options?.createdBy ?? "v2-admin",
    newValue: {
      task_id: taskId,
      dual_write: useDualWrite,
      primary: useDualWrite ? primary : "db-only",
    },
  });

  // Jika dual-write wajib GAS primary sudah di-handle di atas.
  // Di path DB-primary, partial GAS failure tidak menggagalkan create (logged).
  return mapTaskToApi(row);
}

export async function markTaskOpened(taskId: string, token: string): Promise<Task> {
  const task = await prisma.task.findFirst({ where: { taskId, token } });
  if (!task) {
    throw new TaskWriteError("Tugas tidak ditemukan", "TASK_NOT_FOUND", 404);
  }

  const openable = ["CREATED", "SENT", "OPEN", "WA_FAILED"].includes(task.status);
  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      status: openable ? "OPENED" : task.status,
      openedAt: task.openedAt ?? new Date(),
    },
  });


  await writeAuditLog({
    entityType: "task",
    entityId: taskId,
    action: "opened",
    actorType: "staff",
  });

  if (dualWriteEnabled() && isGasEnabled()) {
    const gas = await callGasAction("markOpened", { task_id: taskId, token });
    await logSyncOperation({
      operation: "mark_opened",
      entityType: "task",
      entityId: taskId,
      v1Status: gas.success ? "success" : "failed",
      v2Status: "success",
      v1Response: gas.raw ?? { error: gas.error },
      errorMessage: gas.success ? null : gas.error,
    });
  }

  return mapTaskToApi(updated);
}

export async function verifyTask(
  taskId: string,
  note?: string,
  verifiedBy?: string,
): Promise<Task> {
  const task = await prisma.task.findUnique({ where: { taskId } });
  if (!task) {
    throw new TaskWriteError("Tugas tidak ditemukan", "TASK_NOT_FOUND", 404);
  }

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      status: "DONE",
      finalStatus: "DONE",
      leaderVerification: note ?? null,
      verifiedBy: verifiedBy ?? "v2-admin",
      verifiedAt: new Date(),
    },
  });

  await writeAuditLog({
    entityType: "task",
    entityId: taskId,
    action: "verified",
    actorType: "leader",
    actorName: verifiedBy ?? "v2-admin",
    newValue: { note },
  });

  if (dualWriteEnabled() && isGasEnabled()) {
    const gas = await callGasAction("verifyTask", {
      task_id: taskId,
      status: "approved",
      note,
    });
    await logSyncOperation({
      operation: "verify_task",
      entityType: "task",
      entityId: taskId,
      v1Status: gas.success ? "success" : "failed",
      v2Status: "success",
      v1Response: gas.raw ?? { error: gas.error },
      errorMessage: gas.success ? null : gas.error,
    });
  }

  return mapTaskToApi(updated);
}

export async function requestRevision(
  taskId: string,
  revisionNote: string,
  verifiedBy?: string,
): Promise<Task> {
  if (!revisionNote?.trim()) {
    throw new TaskWriteError("Catatan revisi wajib diisi", "VALIDATION_ERROR");
  }

  const task = await prisma.task.findUnique({ where: { taskId } });
  if (!task) {
    throw new TaskWriteError("Tugas tidak ditemukan", "TASK_NOT_FOUND", 404);
  }

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      status: "REVISION_REQUESTED",
      leaderVerification: revisionNote.trim(),
      verifiedBy: verifiedBy ?? "v2-admin",
      verifiedAt: new Date(),
    },
  });

  await writeAuditLog({
    entityType: "task",
    entityId: taskId,
    action: "revision_requested",
    actorType: "leader",
    actorName: verifiedBy ?? "v2-admin",
    newValue: { revision_note: revisionNote },
  });

  if (dualWriteEnabled() && isGasEnabled()) {
    const gas = await callGasAction("requestRevision", {
      task_id: taskId,
      revision_note: revisionNote,
    });
    await logSyncOperation({
      operation: "request_revision",
      entityType: "task",
      entityId: taskId,
      v1Status: gas.success ? "success" : "failed",
      v2Status: "success",
      v1Response: gas.raw ?? { error: gas.error },
      errorMessage: gas.success ? null : gas.error,
    });
  }

  return mapTaskToApi(updated);
}

export async function resendWhatsApp(taskId: string): Promise<void> {
  const task = await prisma.task.findUnique({ where: { taskId } });
  if (!task) {
    throw new TaskWriteError("Tugas tidak ditemukan", "TASK_NOT_FOUND", 404);
  }

  if (!isGasEnabled()) {
    throw new TaskWriteError(
      "WhatsApp masih via GAS — konfigurasi GAS_WEB_APP_URL dulu",
      "GAS_NOT_CONFIGURED",
      503,
    );
  }

  const gas = await callGasAction("resendWhatsApp", { task_id: taskId });
  await logSyncOperation({
    operation: "resend_wa",
    entityType: "task",
    entityId: taskId,
    v1Status: gas.success ? "success" : "failed",
    v2Status: "success",
    v1Response: gas.raw ?? { error: gas.error },
    errorMessage: gas.success ? null : gas.error,
  });

  if (!gas.success) {
    throw new TaskWriteError(
      gas.error ?? "Gagal kirim ulang WhatsApp",
      "GAS_WA_FAILED",
      502,
    );
  }

  await prisma.task.update({
    where: { id: task.id },
    data: { waSentAt: new Date(), gasSyncedAt: new Date() },
  });
}

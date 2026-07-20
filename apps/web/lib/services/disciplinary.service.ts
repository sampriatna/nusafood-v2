import type {
  CreateDisciplinaryLetterPayload,
  DisciplinaryDashboardData,
  DisciplinaryEvidenceInput,
  DisciplinaryFilters,
  DisciplinaryLetter,
  DisciplinaryLetterLevel,
  DisciplinaryLetterStatus,
  DisciplinaryLetterType,
  DisciplinarySourceType,
  DisciplinarySummary,
  DisciplinaryTaskPrefill,
  UpdateDisciplinaryLetterPayload,
} from "@nusafood/types";
import type { SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TaskWriteError } from "@/lib/services/task-errors";
import {
  buildLetterPreviewText,
  generateDisciplinaryPdfArchive,
} from "@/lib/services/disciplinary-pdf.service";

export class DisciplinaryError extends TaskWriteError {}

const ACTIVE_STATUSES: DisciplinaryLetterStatus[] = [
  "DRAFT",
  "WAITING_APPROVAL",
  "APPROVED",
  "SENT",
  "ACKNOWLEDGED",
];

function todayISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

function actor(session: SessionPayload | null) {
  return {
    id: session?.userId || "system",
    name: session?.userName || session?.userId || "System",
    role: session?.userRole || "ADMIN",
  };
}

function mapEvidence(
  row: {
    id: string;
    disciplinaryLetterId: string;
    evidenceType: string;
    fileUrl: string | null;
    textNote: string | null;
    relatedTaskPhotoId: string | null;
    createdBy: string;
    createdAt: Date;
  },
) {
  return {
    id: row.id,
    disciplinary_letter_id: row.disciplinaryLetterId,
    evidence_type: row.evidenceType as DisciplinaryEvidenceInput["evidence_type"],
    file_url: row.fileUrl,
    text_note: row.textNote,
    related_task_photo_id: row.relatedTaskPhotoId,
    created_by: row.createdBy,
    created_at: row.createdAt.toISOString(),
  };
}

function mapEvent(row: {
  id: string;
  disciplinaryLetterId: string;
  action: string;
  actorId: string;
  actorNameSnapshot: string;
  previousStatus: DisciplinaryLetterStatus | null;
  newStatus: DisciplinaryLetterStatus | null;
  note: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    disciplinary_letter_id: row.disciplinaryLetterId,
    action: row.action,
    actor_id: row.actorId,
    actor_name_snapshot: row.actorNameSnapshot,
    previous_status: row.previousStatus,
    new_status: row.newStatus,
    note: row.note,
    created_at: row.createdAt.toISOString(),
  };
}

function mapLetter(
  row: {
    id: string;
    letterNumber: string;
    type: DisciplinaryLetterType;
    level: number;
    status: DisciplinaryLetterStatus;
    employeeId: string;
    employeeNameSnapshot: string;
    employeePositionSnapshot: string | null;
    outletId: string | null;
    outletNameSnapshot: string;
    relatedTaskId: string | null;
    sourceType: DisciplinarySourceType;
    incidentDate: Date;
    createdBy: string;
    createdByName: string | null;
    approvedBy: string | null;
    approvedByName: string | null;
    approvedAt: Date | null;
    sentAt: Date | null;
    acknowledgedAt: Date | null;
    resolvedAt: Date | null;
    title: string;
    chronology: string;
    violationDetail: string;
    operationalImpact: string | null;
    correctionInstruction: string;
    correctionDeadline: Date | null;
    sopReference: string | null;
    consequence: string | null;
    internalNote: string | null;
    pdfUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
    evidence?: Parameters<typeof mapEvidence>[0][];
    events?: Parameters<typeof mapEvent>[0][];
  },
  historyCount?: number,
): DisciplinaryLetter {
  return {
    id: row.id,
    letter_number: row.letterNumber,
    type: row.type,
    level: row.level as DisciplinaryLetterLevel,
    status: row.status,
    employee_id: row.employeeId,
    employee_name_snapshot: row.employeeNameSnapshot,
    employee_position_snapshot: row.employeePositionSnapshot,
    outlet_id: row.outletId,
    outlet_name_snapshot: row.outletNameSnapshot,
    related_task_id: row.relatedTaskId,
    source_type: row.sourceType,
    incident_date: row.incidentDate.toISOString().slice(0, 10),
    created_by: row.createdBy,
    created_by_name: row.createdByName,
    approved_by: row.approvedBy,
    approved_by_name: row.approvedByName,
    approved_at: row.approvedAt?.toISOString() ?? null,
    sent_at: row.sentAt?.toISOString() ?? null,
    acknowledged_at: row.acknowledgedAt?.toISOString() ?? null,
    resolved_at: row.resolvedAt?.toISOString() ?? null,
    title: row.title,
    chronology: row.chronology,
    violation_detail: row.violationDetail,
    operational_impact: row.operationalImpact,
    correction_instruction: row.correctionInstruction,
    correction_deadline: row.correctionDeadline?.toISOString().slice(0, 10) ?? null,
    sop_reference: row.sopReference,
    consequence: row.consequence,
    internal_note: row.internalNote,
    pdf_url: row.pdfUrl,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    evidence: row.evidence?.map(mapEvidence),
    events: row.events?.map(mapEvent),
    employee_history_count: historyCount,
  };
}

async function addEvent(
  letterId: string,
  action: string,
  session: SessionPayload | null,
  previousStatus: DisciplinaryLetterStatus | null,
  newStatus: DisciplinaryLetterStatus | null,
  note?: string,
) {
  const a = actor(session);
  await prisma.disciplinaryEvent.create({
    data: {
      disciplinaryLetterId: letterId,
      action,
      actorId: a.id,
      actorNameSnapshot: a.name,
      previousStatus: previousStatus ?? undefined,
      newStatus: newStatus ?? undefined,
      note: note || null,
    },
  });
}

async function nextLetterNumber(
  type: DisciplinaryLetterType,
  outletCode: string,
): Promise<string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = type === "TEGURAN" ? "ST" : "SP";
  const code = (outletCode || "ALL").toUpperCase().slice(0, 8);
  const base = `${prefix}/${code}/${y}/${m}/`;
  const latest = await prisma.disciplinaryLetter.findMany({
    where: { letterNumber: { startsWith: base } },
    orderBy: { letterNumber: "desc" },
    take: 1,
  });
  const last = latest[0]?.letterNumber?.split("/").pop();
  const seq = String((Number(last) || 0) + 1).padStart(3, "0");
  return `${base}${seq}`;
}

function validateDraftBasics(payload: CreateDisciplinaryLetterPayload) {
  if (!payload.employee_id?.trim()) {
    throw new DisciplinaryError(
      "Data karyawan belum lengkap.",
      "EMPLOYEE_REQUIRED",
      400,
    );
  }
  if (![1, 2, 3].includes(payload.level)) {
    throw new DisciplinaryError("Level harus 1, 2, atau 3.", "INVALID_LEVEL", 400);
  }
  if (!payload.chronology?.trim()) {
    throw new DisciplinaryError(
      "Kronologi wajib diisi.",
      "CHRONOLOGY_REQUIRED",
      400,
    );
  }
  if (!payload.violation_detail?.trim()) {
    throw new DisciplinaryError(
      "Detail kesalahan wajib diisi.",
      "VIOLATION_REQUIRED",
      400,
    );
  }
  if (!payload.correction_instruction?.trim()) {
    throw new DisciplinaryError(
      "Instruksi perbaikan wajib diisi.",
      "CORRECTION_REQUIRED",
      400,
    );
  }
}

function assertEvidenceReady(
  evidence: { id?: string }[] | undefined,
  forSend: boolean,
) {
  if (forSend && (!evidence || evidence.length === 0)) {
    throw new DisciplinaryError(
      "Bukti belum lengkap, surat belum layak dikirim.",
      "EVIDENCE_REQUIRED",
      400,
    );
  }
}

const includeAll = {
  evidence: { orderBy: { createdAt: "asc" as const } },
  events: { orderBy: { createdAt: "desc" as const } },
};

export async function getDisciplinarySummary(
  filters: DisciplinaryFilters = {},
): Promise<DisciplinarySummary> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

  const whereBase: Record<string, unknown> = {};
  if (filters.outlet && filters.outlet !== "ALL") {
    whereBase.OR = [
      { outletNameSnapshot: { equals: filters.outlet, mode: "insensitive" } },
      { outletId: filters.outlet },
    ];
  }

  const [totalThisMonth, stActive, spActive, waiting, grouped] =
    await Promise.all([
      prisma.disciplinaryLetter.count({
        where: { ...whereBase, createdAt: { gte: monthStart } },
      }),
      prisma.disciplinaryLetter.count({
        where: {
          ...whereBase,
          type: "TEGURAN",
          status: { in: ACTIVE_STATUSES },
        },
      }),
      prisma.disciplinaryLetter.count({
        where: {
          ...whereBase,
          type: "PERINGATAN",
          status: { in: ACTIVE_STATUSES },
        },
      }),
      prisma.disciplinaryLetter.count({
        where: { ...whereBase, status: "WAITING_APPROVAL" },
      }),
      prisma.disciplinaryLetter.groupBy({
        by: ["employeeId"],
        where: whereBase,
        _count: { employeeId: true },
        having: { employeeId: { _count: { gt: 1 } } },
      }),
    ]);

  return {
    total_this_month: totalThisMonth,
    st_active: stActive,
    sp_active: spActive,
    waiting_approval: waiting,
    repeat_employees: grouped.length,
  };
}

export async function listDisciplinaryLetters(
  filters: DisciplinaryFilters = {},
): Promise<DisciplinaryLetter[]> {
  const where: Record<string, unknown> = {};
  if (filters.outlet && filters.outlet !== "ALL") {
    where.OR = [
      { outletNameSnapshot: { equals: filters.outlet, mode: "insensitive" } },
      { outletId: filters.outlet },
    ];
  }
  if (filters.employee_id && filters.employee_id !== "ALL") {
    where.employeeId = filters.employee_id;
  }
  if (filters.type && filters.type !== "ALL") where.type = filters.type;
  if (filters.level && filters.level !== "ALL") where.level = Number(filters.level);
  if (filters.status && filters.status !== "ALL") where.status = filters.status;
  if (filters.date_from || filters.date_to) {
    where.incidentDate = {
      ...(filters.date_from ? { gte: parseDateOnly(filters.date_from) } : {}),
      ...(filters.date_to ? { lte: parseDateOnly(filters.date_to) } : {}),
    };
  }

  const rows = await prisma.disciplinaryLetter.findMany({
    where,
    include: includeAll,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map((r) => mapLetter(r));
}

export async function getDisciplinaryDashboard(
  filters: DisciplinaryFilters = {},
): Promise<DisciplinaryDashboardData> {
  const [summary, letters] = await Promise.all([
    getDisciplinarySummary(filters),
    listDisciplinaryLetters(filters),
  ]);
  return { summary, letters };
}

export async function getDisciplinaryLetter(
  id: string,
): Promise<DisciplinaryLetter | null> {
  const row = await prisma.disciplinaryLetter.findUnique({
    where: { id },
    include: includeAll,
  });
  if (!row) return null;
  const historyCount = await prisma.disciplinaryLetter.count({
    where: { employeeId: row.employeeId },
  });
  return mapLetter(row, historyCount);
}

export async function createDisciplinaryLetter(
  payload: CreateDisciplinaryLetterPayload,
  session: SessionPayload | null,
): Promise<DisciplinaryLetter> {
  validateDraftBasics(payload);
  const a = actor(session);

  let employeeName = payload.employee_name?.trim() || "";
  let employeePosition = payload.employee_position?.trim() || null;
  let outletId = payload.outlet_id || null;
  let outletName = payload.outlet_name?.trim() || "";

  const staff = await prisma.staff.findUnique({
    where: { staffId: payload.employee_id },
    include: { outlet: true },
  });
  if (staff) {
    employeeName = employeeName || staff.name;
    employeePosition = employeePosition || staff.position;
    outletId = outletId || staff.outletId;
    outletName = outletName || staff.outlet?.code || staff.outlet?.name || "";
  }
  if (!employeeName) {
    throw new DisciplinaryError(
      "Data karyawan belum lengkap.",
      "EMPLOYEE_REQUIRED",
      400,
    );
  }
  if (!outletName) outletName = "ALL";

  const wantsApproval =
    payload.submit_for_approval || payload.type === "PERINGATAN";
  const initialStatus: DisciplinaryLetterStatus =
    payload.type === "PERINGATAN" && wantsApproval
      ? "WAITING_APPROVAL"
      : "DRAFT";

  const letterNumber = await nextLetterNumber(payload.type, outletName);
  const title =
    payload.title?.trim() ||
    `${payload.type === "TEGURAN" ? "Surat Teguran" : "Surat Peringatan"} ${payload.level} — ${employeeName}`;

  const created = await prisma.disciplinaryLetter.create({
    data: {
      letterNumber,
      type: payload.type,
      level: payload.level,
      status: initialStatus,
      employeeId: payload.employee_id,
      employeeNameSnapshot: employeeName,
      employeePositionSnapshot: employeePosition,
      outletId,
      outletNameSnapshot: outletName,
      relatedTaskId: payload.related_task_id || null,
      sourceType: payload.source_type,
      incidentDate: parseDateOnly(payload.incident_date || todayISO()),
      createdBy: a.id,
      createdByName: a.name,
      title,
      chronology: payload.chronology.trim(),
      violationDetail: payload.violation_detail.trim(),
      operationalImpact: payload.operational_impact?.trim() || null,
      correctionInstruction: payload.correction_instruction.trim(),
      correctionDeadline: payload.correction_deadline
        ? parseDateOnly(payload.correction_deadline)
        : null,
      sopReference: payload.sop_reference?.trim() || null,
      consequence: payload.consequence?.trim() || null,
      internalNote: payload.internal_note?.trim() || null,
      evidence: payload.evidence?.length
        ? {
            create: payload.evidence.map((e) => ({
              evidenceType: e.evidence_type,
              fileUrl: e.file_url || null,
              textNote: e.text_note || null,
              relatedTaskPhotoId: e.related_task_photo_id || null,
              createdBy: a.id,
            })),
          }
        : undefined,
    },
    include: includeAll,
  });

  await addEvent(
    created.id,
    "CREATED",
    session,
    null,
    initialStatus,
    payload.source_type === "FAKE_REPORT"
      ? "Peringatan integritas: laporan/foto palsu adalah pelanggaran serius."
      : undefined,
  );

  return mapLetter(created);
}

export async function updateDisciplinaryLetter(
  payload: UpdateDisciplinaryLetterPayload,
  session: SessionPayload | null,
): Promise<DisciplinaryLetter> {
  const existing = await prisma.disciplinaryLetter.findUnique({
    where: { id: payload.id },
    include: includeAll,
  });
  if (!existing) {
    throw new DisciplinaryError("Surat tidak ditemukan.", "NOT_FOUND", 404);
  }
  if (!["DRAFT", "WAITING_APPROVAL"].includes(existing.status)) {
    throw new DisciplinaryError(
      "Hanya draft / menunggu approval yang bisa diedit.",
      "NOT_EDITABLE",
      400,
    );
  }

  const merged: CreateDisciplinaryLetterPayload = {
    type: payload.type || existing.type,
    level: (payload.level || existing.level) as DisciplinaryLetterLevel,
    employee_id: payload.employee_id || existing.employeeId,
    outlet_id: payload.outlet_id ?? existing.outletId,
    outlet_name: payload.outlet_name ?? existing.outletNameSnapshot,
    employee_name: payload.employee_name ?? existing.employeeNameSnapshot,
    employee_position:
      payload.employee_position ?? existing.employeePositionSnapshot,
    related_task_id: payload.related_task_id ?? existing.relatedTaskId,
    source_type: payload.source_type || existing.sourceType,
    incident_date:
      payload.incident_date ||
      existing.incidentDate.toISOString().slice(0, 10),
    title: payload.title ?? existing.title,
    chronology: payload.chronology ?? existing.chronology,
    violation_detail: payload.violation_detail ?? existing.violationDetail,
    operational_impact:
      payload.operational_impact ?? existing.operationalImpact,
    correction_instruction:
      payload.correction_instruction ?? existing.correctionInstruction,
    correction_deadline:
      payload.correction_deadline ??
      existing.correctionDeadline?.toISOString().slice(0, 10) ??
      null,
    sop_reference: payload.sop_reference ?? existing.sopReference,
    consequence: payload.consequence ?? existing.consequence,
    internal_note: payload.internal_note ?? existing.internalNote,
  };
  validateDraftBasics(merged);

  const updated = await prisma.disciplinaryLetter.update({
    where: { id: payload.id },
    data: {
      type: merged.type,
      level: merged.level,
      employeeId: merged.employee_id,
      employeeNameSnapshot: merged.employee_name || existing.employeeNameSnapshot,
      employeePositionSnapshot:
        merged.employee_position || existing.employeePositionSnapshot,
      outletId: merged.outlet_id || existing.outletId,
      outletNameSnapshot: merged.outlet_name || existing.outletNameSnapshot,
      relatedTaskId: merged.related_task_id || null,
      sourceType: merged.source_type,
      incidentDate: parseDateOnly(merged.incident_date),
      title: merged.title || existing.title,
      chronology: merged.chronology.trim(),
      violationDetail: merged.violation_detail.trim(),
      operationalImpact: merged.operational_impact?.trim() || null,
      correctionInstruction: merged.correction_instruction.trim(),
      correctionDeadline: merged.correction_deadline
        ? parseDateOnly(merged.correction_deadline)
        : null,
      sopReference: merged.sop_reference?.trim() || null,
      consequence: merged.consequence?.trim() || null,
      internalNote: merged.internal_note?.trim() || null,
    },
    include: includeAll,
  });

  if (payload.evidence) {
    await prisma.disciplinaryEvidence.deleteMany({
      where: { disciplinaryLetterId: payload.id },
    });
    const a = actor(session);
    if (payload.evidence.length) {
      await prisma.disciplinaryEvidence.createMany({
        data: payload.evidence.map((e) => ({
          disciplinaryLetterId: payload.id,
          evidenceType: e.evidence_type,
          fileUrl: e.file_url || null,
          textNote: e.text_note || null,
          relatedTaskPhotoId: e.related_task_photo_id || null,
          createdBy: a.id,
        })),
      });
    }
  }

  await addEvent(payload.id, "UPDATED", session, existing.status, existing.status);
  const fresh = await getDisciplinaryLetter(payload.id);
  if (!fresh) throw new DisciplinaryError("Surat tidak ditemukan.", "NOT_FOUND", 404);
  return fresh;
}

export async function submitForApproval(
  id: string,
  session: SessionPayload | null,
): Promise<DisciplinaryLetter> {
  const letter = await prisma.disciplinaryLetter.findUnique({
    where: { id },
    include: includeAll,
  });
  if (!letter) throw new DisciplinaryError("Surat tidak ditemukan.", "NOT_FOUND", 404);
  if (letter.status !== "DRAFT" && letter.status !== "WAITING_APPROVAL") {
    throw new DisciplinaryError(
      "Status surat tidak bisa diajukan approval.",
      "INVALID_STATUS",
      400,
    );
  }
  assertEvidenceReady(letter.evidence, true);
  if (!letter.chronology.trim() || !letter.violationDetail.trim()) {
    throw new DisciplinaryError(
      "Kronologi dan detail kesalahan wajib lengkap.",
      "INCOMPLETE",
      400,
    );
  }

  const updated = await prisma.disciplinaryLetter.update({
    where: { id },
    data: { status: "WAITING_APPROVAL" },
    include: includeAll,
  });
  await addEvent(id, "SUBMIT_APPROVAL", session, letter.status, "WAITING_APPROVAL");
  return mapLetter(updated);
}

export async function approveLetter(
  id: string,
  session: SessionPayload | null,
): Promise<DisciplinaryLetter> {
  const a = actor(session);
  if (a.role !== "ADMIN" && session?.userId !== "env-admin") {
    throw new DisciplinaryError(
      "Hanya Owner/Admin yang boleh approve SP.",
      "FORBIDDEN",
      403,
    );
  }
  const letter = await prisma.disciplinaryLetter.findUnique({
    where: { id },
    include: includeAll,
  });
  if (!letter) throw new DisciplinaryError("Surat tidak ditemukan.", "NOT_FOUND", 404);
  if (letter.status !== "WAITING_APPROVAL" && letter.type !== "TEGURAN") {
    throw new DisciplinaryError(
      "SP belum dalam status menunggu approval.",
      "INVALID_STATUS",
      400,
    );
  }

  const updated = await prisma.disciplinaryLetter.update({
    where: { id },
    data: {
      status: "APPROVED",
      approvedBy: a.id,
      approvedByName: a.name,
      approvedAt: new Date(),
    },
    include: includeAll,
  });
  await addEvent(id, "APPROVED", session, letter.status, "APPROVED");
  return mapLetter(updated);
}

export async function generatePdf(
  id: string,
  session: SessionPayload | null,
  origin = "",
): Promise<DisciplinaryLetter> {
  const letter = await getDisciplinaryLetter(id);
  if (!letter) throw new DisciplinaryError("Surat tidak ditemukan.", "NOT_FOUND", 404);

  if (letter.type === "PERINGATAN" && letter.status === "DRAFT") {
    throw new DisciplinaryError(
      "SP belum disetujui owner/admin.",
      "NOT_APPROVED",
      400,
    );
  }
  if (
    letter.type === "PERINGATAN" &&
    !["APPROVED", "SENT", "ACKNOWLEDGED", "RESOLVED", "WAITING_APPROVAL"].includes(
      letter.status,
    )
  ) {
    throw new DisciplinaryError(
      "SP belum disetujui owner/admin.",
      "NOT_APPROVED",
      400,
    );
  }
  if (letter.type === "PERINGATAN" && letter.status === "WAITING_APPROVAL") {
    throw new DisciplinaryError(
      "SP belum disetujui owner/admin.",
      "NOT_APPROVED",
      400,
    );
  }

  const { url } = await generateDisciplinaryPdfArchive(letter, origin);
  const updated = await prisma.disciplinaryLetter.update({
    where: { id },
    data: { pdfUrl: url },
    include: includeAll,
  });
  await addEvent(id, "PDF_GENERATED", session, letter.status, letter.status, url);
  return mapLetter(updated);
}

export async function sendLetter(
  id: string,
  session: SessionPayload | null,
): Promise<DisciplinaryLetter> {
  const letter = await prisma.disciplinaryLetter.findUnique({
    where: { id },
    include: includeAll,
  });
  if (!letter) throw new DisciplinaryError("Surat tidak ditemukan.", "NOT_FOUND", 404);
  assertEvidenceReady(letter.evidence, true);

  if (letter.type === "PERINGATAN") {
    if (letter.status !== "APPROVED" && letter.status !== "SENT") {
      throw new DisciplinaryError(
        "SP belum disetujui owner/admin.",
        "NOT_APPROVED",
        400,
      );
    }
    if (!letter.pdfUrl) {
      throw new DisciplinaryError("PDF belum dibuat.", "PDF_REQUIRED", 400);
    }
  } else if (!["DRAFT", "APPROVED", "WAITING_APPROVAL"].includes(letter.status)) {
    throw new DisciplinaryError(
      "Status surat tidak bisa dikirim.",
      "INVALID_STATUS",
      400,
    );
  }

  const updated = await prisma.disciplinaryLetter.update({
    where: { id },
    data: { status: "SENT", sentAt: new Date() },
    include: includeAll,
  });
  await addEvent(id, "SENT", session, letter.status, "SENT");
  return mapLetter(updated);
}

export async function acknowledgeLetter(
  id: string,
  session: SessionPayload | null,
): Promise<DisciplinaryLetter> {
  const letter = await prisma.disciplinaryLetter.findUnique({ where: { id } });
  if (!letter) throw new DisciplinaryError("Surat tidak ditemukan.", "NOT_FOUND", 404);
  if (letter.status !== "SENT") {
    throw new DisciplinaryError(
      "Hanya surat terkirim yang bisa ditandai dibaca.",
      "INVALID_STATUS",
      400,
    );
  }
  const updated = await prisma.disciplinaryLetter.update({
    where: { id },
    data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date() },
    include: includeAll,
  });
  await addEvent(id, "ACKNOWLEDGED", session, letter.status, "ACKNOWLEDGED");
  return mapLetter(updated);
}

export async function resolveLetter(
  id: string,
  session: SessionPayload | null,
): Promise<DisciplinaryLetter> {
  const letter = await prisma.disciplinaryLetter.findUnique({ where: { id } });
  if (!letter) throw new DisciplinaryError("Surat tidak ditemukan.", "NOT_FOUND", 404);
  if (!["SENT", "ACKNOWLEDGED"].includes(letter.status)) {
    throw new DisciplinaryError(
      "Surat belum dalam status yang bisa diselesaikan.",
      "INVALID_STATUS",
      400,
    );
  }
  const updated = await prisma.disciplinaryLetter.update({
    where: { id },
    data: { status: "RESOLVED", resolvedAt: new Date() },
    include: includeAll,
  });
  await addEvent(id, "RESOLVED", session, letter.status, "RESOLVED");
  return mapLetter(updated);
}

export async function cancelLetter(
  id: string,
  session: SessionPayload | null,
  note?: string,
): Promise<DisciplinaryLetter> {
  const letter = await prisma.disciplinaryLetter.findUnique({ where: { id } });
  if (!letter) throw new DisciplinaryError("Surat tidak ditemukan.", "NOT_FOUND", 404);
  if (["RESOLVED", "CANCELLED"].includes(letter.status)) {
    throw new DisciplinaryError(
      "Surat sudah selesai/dibatalkan.",
      "INVALID_STATUS",
      400,
    );
  }
  const updated = await prisma.disciplinaryLetter.update({
    where: { id },
    data: { status: "CANCELLED" },
    include: includeAll,
  });
  await addEvent(id, "CANCELLED", session, letter.status, "CANCELLED", note);
  return mapLetter(updated);
}

export function getLetterPreview(letter: DisciplinaryLetter): string {
  return buildLetterPreviewText(letter);
}

export async function buildPrefillFromTask(
  taskId: string,
): Promise<DisciplinaryTaskPrefill> {
  const task = await prisma.task.findUnique({
    where: { taskId },
    include: { staff: true, outlet: true },
  });
  if (!task) {
    throw new DisciplinaryError(
      "Gagal membuat teguran dari task. Cek relasi task dan karyawan.",
      "TASK_NOT_FOUND",
      404,
    );
  }

  const employeeId = task.staffId || task.picWa || "UNKNOWN";
  const previousCount = await prisma.disciplinaryLetter.count({
    where: {
      employeeId,
      status: { not: "CANCELLED" },
    },
  });

  let suggestedType: DisciplinaryLetterType = "TEGURAN";
  let suggestedLevel: DisciplinaryLetterLevel = 1;
  if (previousCount >= 2) suggestedLevel = 3;
  else if (previousCount === 1) suggestedLevel = 2;

  const isLate =
    task.isLate ||
    task.status === "LATE" ||
    (task.deadline < new Date() &&
      !["DONE", "VERIFIED"].includes(task.status));

  const evidence: DisciplinaryEvidenceInput[] = [];
  if (task.beforePhotoUrl) {
    evidence.push({
      evidence_type: "PHOTO",
      file_url: task.beforePhotoUrl,
      text_note: "Foto before dari task",
    });
  }
  if (task.afterPhotoUrl) {
    evidence.push({
      evidence_type: "PHOTO",
      file_url: task.afterPhotoUrl,
      text_note: "Foto after / laporan dari task",
    });
  }
  if (task.reportLink) {
    evidence.push({
      evidence_type: "LINK",
      file_url: task.reportLink,
      text_note: "Link laporan task",
    });
  }
  if (task.staffNote) {
    evidence.push({
      evidence_type: "NOTE",
      text_note: `Catatan staff: ${task.staffNote}`,
    });
  }

  const deadlineStr = task.deadline.toISOString();
  return {
    related_task_id: task.taskId,
    employee_id: employeeId,
    employee_name: task.staff?.name || task.picName,
    employee_position: task.staff?.position || null,
    outlet_id: task.outletId,
    outlet_name: task.outlet?.code || task.outletName || "ALL",
    source_type: isLate ? "TASK_LATE" : "TASK_INCOMPLETE",
    incident_date: todayISO(),
    title: `Teguran — ${task.taskTitle}`,
    chronology: `Task ${task.taskId} berjudul "${task.taskTitle}" memiliki deadline ${deadlineStr}. Status saat ini: ${task.status}${task.isLate || isLate ? " (terlambat)" : ""}.`,
    violation_detail: isLate
      ? `Karyawan terlambat menyelesaikan / melaporkan task "${task.taskTitle}".`
      : `Task "${task.taskTitle}" belum selesai sesuai standar.`,
    correction_instruction:
      "Selesaikan tugas sesuai standar, kirim laporan dengan foto asli dan jelas, serta laporkan kendala ke leader sebelum deadline.",
    suggested_type: suggestedType,
    suggested_level: suggestedLevel,
    integrity_warning: false,
    evidence,
    task_link: task.reportLink,
    previous_letter_count: previousCount,
  };
}

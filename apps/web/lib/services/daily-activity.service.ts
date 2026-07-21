import { randomBytes } from "crypto";
import type {
  CreateReportTemplatePayload,
  DailyReportDashboardData,
  DailyReportDashboardRow,
  DailyReportDashboardSummary,
  DailyReportFilters,
  DailyReportRowLabel,
  DailyReportSubmission,
  ReportConditionStatus,
  ReportTemplate,
  ReportTemplateKind,
  StaffReportLink,
  StaffReportLinkContext,
  StaffReportValidationStatus,
  UpdateReportTemplatePayload,
} from "@nusafood/types";
import { prisma } from "@/lib/db";
import {
  mapDailySubmission,
  mapReportTemplate,
  mapStaffReportLink,
} from "@/lib/mappers/daily-activity";
import { normalizePositionGroup } from "@/lib/position-groups";
import { TaskWriteError } from "@/lib/services/task-errors";

export { normalizePositionGroup };

export class DailyActivityError extends TaskWriteError {}

function todayISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

function parseTime(value?: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  return new Date(Date.UTC(1970, 0, 1, hh, mm, 0));
}

export function generateReportToken(): string {
  return randomBytes(32).toString("hex");
}

export function slugifyStaffName(name: string): string {
  const raw = (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .slice(0, 48)
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
  return raw || "staff";
}

function matchesPositionGroup(
  templateGroup: string | null,
  staffPosition: string,
): boolean {
  if (!templateGroup) return true;
  const staffGroup = normalizePositionGroup(staffPosition);
  const tpl = templateGroup.trim().toLowerCase();
  if (staffGroup.toLowerCase() === tpl) return true;
  return staffPosition.trim().toLowerCase() === tpl;
}

function isIssueCondition(c: ReportConditionStatus): boolean {
  return c !== "aman";
}

function needsLeaderFix(
  validation?: StaffReportValidationStatus | null,
): boolean {
  return (
    validation === "revisi" ||
    validation === "tidak_valid" ||
    validation === "manipulasi"
  );
}

function rowLabel(
  submitted: boolean,
  isRequired: boolean,
  condition?: ReportConditionStatus | null,
  leaderValidation?: StaffReportValidationStatus | null,
): DailyReportRowLabel {
  if (!isRequired && !submitted) return "tidak_wajib";
  if (!submitted) return "belum_submit";
  if (needsLeaderFix(leaderValidation)) return "perlu_perbaikan";
  if (condition && isIssueCondition(condition)) return "selesai_kendala";
  return "selesai_lengkap";
}

async function resolveOutletIdByCode(code?: string | null) {
  if (!code || code === "ALL") return null;
  const row = await prisma.outlet.findFirst({
    where: {
      OR: [
        { code: { equals: code, mode: "insensitive" } },
        { name: { equals: code, mode: "insensitive" } },
      ],
    },
  });
  if (!row) {
    throw new DailyActivityError(
      `Outlet tidak ditemukan: ${code}`,
      "OUTLET_NOT_FOUND",
      422,
    );
  }
  return row.id;
}

async function ensureUniqueShortCode(base: string, excludeId?: string) {
  let candidate = base;
  let i = 2;
  while (true) {
    const existing = await prisma.staffReportLink.findUnique({
      where: { shortCode: candidate },
    });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${base}${i}`;
    i += 1;
  }
}

function nextTemplateCode() {
  return `RTPL-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

export async function listReportTemplates(): Promise<ReportTemplate[]> {
  const rows = await prisma.reportTemplate.findMany({
    include: {
      outlet: true,
      items: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(mapReportTemplate);
}

/** Daftar admin tanpa checklist penuh — lebih cepat untuk halaman list. */
export async function getReportTemplateById(
  id: string,
): Promise<ReportTemplate | null> {
  const row = await prisma.reportTemplate.findUnique({
    where: { id },
    include: {
      outlet: true,
      items: { orderBy: { sortOrder: "asc" } },
    },
  });
  return row ? mapReportTemplate(row) : null;
}

export async function listReportTemplatesForAdmin(): Promise<
  (ReportTemplate & { checklist_item_count: number })[]
> {
  const rows = await prisma.reportTemplate.findMany({
    include: {
      outlet: true,
      _count: { select: { items: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return rows.map((row) => ({
    ...mapReportTemplate({ ...row, items: [] }),
    checklist_item_count: row._count.items,
  }));
}

export async function createReportTemplate(
  payload: CreateReportTemplatePayload,
): Promise<ReportTemplate> {
  const outletId = await resolveOutletIdByCode(payload.outlet_id ?? null);
  const kind: ReportTemplateKind =
    payload.kind ||
    (payload.is_required_daily ? "daily_required" : "special_task");
  const standard =
    (payload.standard_result || payload.description || "").trim() ||
    payload.title.trim();

  const created = await prisma.reportTemplate.create({
    data: {
      code: nextTemplateCode(),
      title: payload.title.trim(),
      category: payload.category || "General",
      outletId,
      positionGroup: payload.position_group || null,
      standardResult: standard,
      description: (payload.description || payload.standard_result || "").trim(),
      requiresPhoto: Boolean(payload.requires_photo),
      isRequiredDaily: Boolean(payload.is_required_daily),
      kind,
      targetTimeStart: parseTime(payload.target_time_start),
      targetTimeEnd: parseTime(payload.target_time_end),
      active: payload.active !== false,
      sortOrder: payload.sort_order ?? 10,
      items: payload.checklist_items?.length
        ? {
            create: payload.checklist_items
              .map((item, index) => ({
                itemText: item.item_text.trim(),
                isRequired: item.is_required !== false,
                sortOrder: item.sort_order ?? index + 1,
              }))
              .filter((i) => i.itemText),
          }
        : undefined,
    },
    include: {
      outlet: true,
      items: { orderBy: { sortOrder: "asc" } },
    },
  });
  return mapReportTemplate(created);
}

export async function updateReportTemplate(
  payload: UpdateReportTemplatePayload,
): Promise<ReportTemplate> {
  const existing = await prisma.reportTemplate.findUnique({
    where: { id: payload.id },
  });
  if (!existing) {
    throw new DailyActivityError(
      "Template tidak ditemukan",
      "TEMPLATE_NOT_FOUND",
      404,
    );
  }

  const data: Record<string, unknown> = {};
  if (payload.title !== undefined) data.title = payload.title.trim();
  if (payload.category !== undefined) data.category = payload.category;
  if (payload.standard_result !== undefined)
    data.standardResult = payload.standard_result.trim();
  if (payload.description !== undefined)
    data.description = payload.description.trim();
  if (payload.position_group !== undefined)
    data.positionGroup = payload.position_group || null;
  if (payload.requires_photo !== undefined)
    data.requiresPhoto = payload.requires_photo;
  if (payload.is_required_daily !== undefined)
    data.isRequiredDaily = payload.is_required_daily;
  if (payload.kind !== undefined) data.kind = payload.kind;
  if (payload.target_time_start !== undefined)
    data.targetTimeStart = parseTime(payload.target_time_start);
  if (payload.target_time_end !== undefined)
    data.targetTimeEnd = parseTime(payload.target_time_end);
  if (payload.active !== undefined) data.active = payload.active;
  if (payload.sort_order !== undefined) data.sortOrder = payload.sort_order;
  if (payload.outlet_id !== undefined) {
    data.outletId = await resolveOutletIdByCode(payload.outlet_id);
  }

  await prisma.$transaction(async (tx) => {
    await tx.reportTemplate.update({
      where: { id: payload.id },
      data,
    });
    if (payload.checklist_items !== undefined) {
      const oldItems = await tx.reportTemplateChecklistItem.findMany({
        where: { reportTemplateId: payload.id },
        select: { id: true },
      });
      if (oldItems.length) {
        await tx.dailyReportChecklistAnswer.deleteMany({
          where: { checklistItemId: { in: oldItems.map((i) => i.id) } },
        });
      }
      await tx.reportTemplateChecklistItem.deleteMany({
        where: { reportTemplateId: payload.id },
      });
      const items = payload.checklist_items
        .map((item, index) => ({
          reportTemplateId: payload.id,
          itemText: item.item_text.trim(),
          isRequired: item.is_required !== false,
          sortOrder: item.sort_order ?? index + 1,
        }))
        .filter((i) => i.itemText);
      if (items.length) {
        await tx.reportTemplateChecklistItem.createMany({ data: items });
      }
    }
  });

  const updated = await prisma.reportTemplate.findUniqueOrThrow({
    where: { id: payload.id },
    include: {
      outlet: true,
      items: { orderBy: { sortOrder: "asc" } },
    },
  });
  return mapReportTemplate(updated);
}

export async function listStaffReportLinks(
  origin?: string,
): Promise<StaffReportLink[]> {
  const rows = await prisma.staffReportLink.findMany({
    include: { staff: { include: { outlet: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => mapStaffReportLink(row, origin));
}

export async function generateStaffReportLink(
  staffId: string,
  origin?: string,
): Promise<StaffReportLink> {
  const staff = await prisma.staff.findUnique({
    where: { staffId },
    include: { outlet: true },
  });
  if (!staff) {
    throw new DailyActivityError(
      "Staff tidak ditemukan",
      "STAFF_NOT_FOUND",
      404,
    );
  }
  if (staff.status !== "ACTIVE") {
    throw new DailyActivityError("Staff tidak aktif", "STAFF_INACTIVE", 400);
  }

  const shortCode = await ensureUniqueShortCode(slugifyStaffName(staff.name));

  const link = await prisma.$transaction(async (tx) => {
    await tx.staffReportLink.updateMany({
      where: { staffId, isActive: true },
      data: { isActive: false, revokedAt: new Date() },
    });
    return tx.staffReportLink.create({
      data: {
        staffId,
        token: generateReportToken(),
        shortCode,
        isActive: true,
      },
      include: { staff: { include: { outlet: true } } },
    });
  });

  return mapStaffReportLink(link, origin);
}

export async function revokeStaffReportLink(
  linkId: string,
  origin?: string,
): Promise<StaffReportLink> {
  const existing = await prisma.staffReportLink.findUnique({
    where: { id: linkId },
  });
  if (!existing) {
    throw new DailyActivityError("Link tidak ditemukan", "LINK_NOT_FOUND", 404);
  }
  const link = await prisma.staffReportLink.update({
    where: { id: linkId },
    data: { isActive: false, revokedAt: new Date() },
    include: { staff: { include: { outlet: true } } },
  });
  return mapStaffReportLink(link, origin);
}

async function getLinkByTokenOrCode(tokenOrCode: string) {
  const key = tokenOrCode.trim();
  if (!key) return null;
  const lower = key.toLowerCase();
  return prisma.staffReportLink.findFirst({
    where: {
      OR: [
        { token: key },
        { token: { equals: key, mode: "insensitive" } },
        { shortCode: lower },
      ],
    },
    include: { staff: { include: { outlet: true } } },
  });
}

export async function matchTemplatesForStaff(
  outletCode: string,
  position: string,
): Promise<ReportTemplate[]> {
  const staffGroup = normalizePositionGroup(position);
  const positionKey = position.trim();

  const rows = await prisma.reportTemplate.findMany({
    where: {
      active: true,
      AND: [
        {
          OR: [{ outletId: null }, { outlet: { code: outletCode } }],
        },
        {
          OR: [
            { positionGroup: null },
            ...(staffGroup ? [{ positionGroup: staffGroup }] : []),
            ...(positionKey ? [{ positionGroup: positionKey }] : []),
          ],
        },
      ],
    },
    include: {
      outlet: true,
      items: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { sortOrder: "asc" },
  });

  return rows
    .filter((t) => matchesPositionGroup(t.positionGroup, position))
    .map(mapReportTemplate);
}

export async function getStaffReportByToken(
  token: string,
): Promise<StaffReportLinkContext> {
  if (!token || token.trim().length < 2) {
    throw new DailyActivityError("Token tidak valid", "INVALID_TOKEN", 400);
  }

  const link = await getLinkByTokenOrCode(token);
  if (!link) {
    throw new DailyActivityError(
      "Link tidak ditemukan. Hubungi atasan Anda.",
      "LINK_NOT_FOUND",
      404,
    );
  }
  if (!link.isActive) {
    throw new DailyActivityError(
      "Link sudah dinonaktifkan. Minta link baru ke atasan Anda.",
      "LINK_REVOKED",
      403,
    );
  }

  const staff = link.staff;
  if (!staff || staff.status !== "ACTIVE") {
    throw new DailyActivityError(
      "Staff tidak aktif. Hubungi atasan Anda.",
      "STAFF_INACTIVE",
      403,
    );
  }

  const outletCode = staff.outlet?.code ?? "";
  const templates = await matchTemplatesForStaff(
    outletCode,
    staff.position ?? "",
  );

  const today = parseDateOnly(todayISO());
  const submissions = await prisma.dailyReportSubmission.findMany({
    where: { staffId: staff.staffId, reportDate: today },
    include: {
      template: { select: { title: true } },
      answers: { include: { item: { select: { itemText: true } } } },
    },
  });

  return {
    link: mapStaffReportLink(link),
    staff: {
      staff_id: staff.staffId,
      name: staff.name,
      outlet: outletCode,
      position: staff.position ?? "",
      position_group: normalizePositionGroup(staff.position ?? ""),
    },
    templates,
    today_submissions: submissions.map((sub) =>
      mapDailySubmission(
        sub as Parameters<typeof mapDailySubmission>[0],
      ),
    ),
  };
}

export async function submitDailyReport(input: {
  token: string;
  report_template_id: string;
  status_condition: ReportConditionStatus;
  note?: string;
  photo_url?: string | null;
  checklist_answers: { checklist_item_id: string; checked: boolean }[];
}): Promise<DailyReportSubmission> {
  const ctx = await getStaffReportByToken(input.token);
  const { staff, templates } = ctx;
  const template = templates.find((t) => t.id === input.report_template_id);
  if (!template) {
    throw new DailyActivityError(
      "Kegiatan tidak tersedia untuk staff ini.",
      "TEMPLATE_NOT_AVAILABLE",
      400,
    );
  }

  const items = template.checklist_items ?? [];
  const answerMap = new Map(
    (input.checklist_answers || []).map((a) => [
      a.checklist_item_id,
      Boolean(a.checked),
    ]),
  );

  for (const a of input.checklist_answers || []) {
    if (!items.some((i) => i.id === a.checklist_item_id)) {
      throw new DailyActivityError(
        "Checklist tidak valid untuk kegiatan ini.",
        "INVALID_CHECKLIST",
        400,
      );
    }
  }

  if (items.length > 0 && (input.checklist_answers || []).length === 0) {
    throw new DailyActivityError(
      "Centang checklist kegiatan terlebih dahulu.",
      "CHECKLIST_REQUIRED",
      400,
    );
  }

  if (template.requires_photo && !input.photo_url) {
    const today = parseDateOnly(todayISO());
    const existing = await prisma.dailyReportSubmission.findUnique({
      where: {
        staffId_reportTemplateId_reportDate: {
          staffId: staff.staff_id,
          reportTemplateId: template.id,
          reportDate: today,
        },
      },
    });
    if (!existing?.photoUrl) {
      throw new DailyActivityError(
        "Foto wajib untuk kegiatan ini.",
        "PHOTO_REQUIRED",
        400,
      );
    }
  }

  const validConditions: ReportConditionStatus[] = [
    "aman",
    "kendala_ringan",
    "follow_up_leader",
    "perlu_belanja",
  ];
  if (!validConditions.includes(input.status_condition)) {
    throw new DailyActivityError(
      "Pilih status kondisi kegiatan.",
      "INVALID_CONDITION",
      400,
    );
  }

  const note = (input.note || "").trim();
  if (isIssueCondition(input.status_condition) && !note) {
    throw new DailyActivityError(
      "Catatan kendala wajib diisi jika status bukan Aman.",
      "NOTE_REQUIRED",
      400,
    );
  }

  const staffRow = await prisma.staff.findUniqueOrThrow({
    where: { staffId: staff.staff_id },
  });
  const today = parseDateOnly(todayISO());
  const now = new Date();

  const submission = await prisma.$transaction(async (tx) => {
    const upserted = await tx.dailyReportSubmission.upsert({
      where: {
        staffId_reportTemplateId_reportDate: {
          staffId: staff.staff_id,
          reportTemplateId: template.id,
          reportDate: today,
        },
      },
      create: {
        staffId: staff.staff_id,
        outletId: staffRow.outletId,
        reportTemplateId: template.id,
        reportDate: today,
        statusCondition: input.status_condition,
        note,
        photoUrl: input.photo_url ?? null,
        submittedAt: now,
      },
      update: {
        statusCondition: input.status_condition,
        note,
        photoUrl: input.photo_url ?? undefined,
        submittedAt: now,
        leaderValidation: null,
        leaderValidationNote: null,
        leaderValidatedAt: null,
        leaderValidatedBy: null,
        leaderValidatedByName: null,
        leaderValidationPhotoUrl: null,
      },
    });

    await tx.dailyReportChecklistAnswer.deleteMany({
      where: { submissionId: upserted.id },
    });

    if (items.length) {
      await tx.dailyReportChecklistAnswer.createMany({
        data: items.map((item) => ({
          submissionId: upserted.id,
          checklistItemId: item.id,
          checked: Boolean(answerMap.get(item.id)),
        })),
      });
    }

    return tx.dailyReportSubmission.findUniqueOrThrow({
      where: { id: upserted.id },
      include: {
        staff: { include: { outlet: true } },
        outlet: true,
        template: true,
        answers: { include: { item: true } },
      },
    });
  });

  return mapDailySubmission(submission);
}

export async function buildDailyReportDashboard(
  filters: DailyReportFilters = {},
): Promise<DailyReportDashboardData> {
  const date = filters.date || todayISO();
  const reportDate = parseDateOnly(date);

  const staffList = await prisma.staff.findMany({
    where: {
      status: "ACTIVE",
      ...(filters.staff_id && filters.staff_id !== "ALL"
        ? { staffId: filters.staff_id }
        : {}),
      ...(filters.outlet && filters.outlet !== "ALL"
        ? {
            outlet: {
              OR: [
                { code: { equals: filters.outlet, mode: "insensitive" } },
                { name: { equals: filters.outlet, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    include: { outlet: true },
    orderBy: { name: "asc" },
  });

  const templates = await prisma.reportTemplate.findMany({
    where: { active: true },
    include: {
      outlet: true,
      items: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { sortOrder: "asc" },
  });

  const submissions = await prisma.dailyReportSubmission.findMany({
    where: { reportDate },
    include: {
      staff: { include: { outlet: true } },
      outlet: true,
      template: true,
      answers: { include: { item: true } },
    },
  });
  const mappedSubs = submissions.map(mapDailySubmission);

  const rows: DailyReportDashboardRow[] = [];

  for (const staff of staffList) {
    const outletCode = staff.outlet?.code ?? "";
    const matched = templates
      .filter((t) => {
        const outletOk = !t.outletId || t.outlet?.code === outletCode;
        const positionOk = matchesPositionGroup(
          t.positionGroup,
          staff.position ?? "",
        );
        return outletOk && positionOk;
      })
      .map(mapReportTemplate);

    for (const template of matched) {
      if (
        filters.report_template_id &&
        filters.report_template_id !== "ALL" &&
        template.id !== filters.report_template_id
      ) {
        continue;
      }

      const submission =
        mappedSubs.find(
          (s) =>
            s.staff_id === staff.staffId &&
            s.report_template_id === template.id,
        ) || null;

      const submitted = Boolean(submission);
      if (filters.submit_status === "submitted" && !submitted) continue;
      if (filters.submit_status === "not_submitted" && submitted) continue;

      const checklistTotal =
        submission?.checklist_total ?? template.checklist_items?.length ?? 0;
      const checklistChecked = submission?.checklist_checked ?? 0;
      const checklistPercent = submission?.checklist_percent ?? 0;
      const label = rowLabel(
        submitted,
        template.is_required_daily,
        submission?.status_condition,
        submission?.leader_validation,
      );

      rows.push({
        staff_id: staff.staffId,
        staff_name: staff.name,
        outlet: outletCode,
        position: staff.position ?? "",
        report_template_id: template.id,
        report_title: template.title,
        category: template.category,
        is_required_daily: template.is_required_daily,
        submitted,
        submission,
        submitted_at: submission?.submitted_at ?? null,
        photo_url: submission?.photo_url ?? null,
        note: submission?.note ?? null,
        status_condition: submission?.status_condition ?? null,
        checklist_total: checklistTotal,
        checklist_checked: checklistChecked,
        checklist_percent: checklistPercent,
        label,
      });
    }
  }

  const requiredRows = rows.filter((r) => r.is_required_daily);
  const staffWithRequired = new Set(requiredRows.map((r) => r.staff_id));
  const staffFullySubmitted = new Set<string>();
  for (const staffId of staffWithRequired) {
    const req = requiredRows.filter((r) => r.staff_id === staffId);
    if (req.length > 0 && req.every((r) => r.submitted)) {
      staffFullySubmitted.add(staffId);
    }
  }

  const summary: DailyReportDashboardSummary = {
    total_today: mappedSubs.length,
    staff_submitted: staffFullySubmitted.size,
    staff_not_submitted: Math.max(
      0,
      staffWithRequired.size - staffFullySubmitted.size,
    ),
    reports_with_issue: mappedSubs.filter((s) =>
      isIssueCondition(s.status_condition),
    ).length,
    complete_ok: rows.filter((r) => r.label === "selesai_lengkap").length,
    complete_with_issue: rows.filter((r) => r.label === "selesai_kendala")
      .length,
    not_submitted: rows.filter((r) => r.label === "belum_submit").length,
  };

  const missing_required = rows.filter(
    (r) => r.is_required_daily && !r.submitted,
  );

  const enrichedSubmissions = mappedSubs.filter((s) => {
    if (
      filters.outlet &&
      filters.outlet !== "ALL" &&
      s.outlet_id !== filters.outlet &&
      s.outlet !== filters.outlet
    ) {
      return false;
    }
    if (
      filters.staff_id &&
      filters.staff_id !== "ALL" &&
      s.staff_id !== filters.staff_id
    ) {
      return false;
    }
    if (
      filters.report_template_id &&
      filters.report_template_id !== "ALL" &&
      s.report_template_id !== filters.report_template_id
    ) {
      return false;
    }
    return true;
  });

  return {
    summary,
    rows,
    submissions: enrichedSubmissions,
    missing_required,
  };
}

/** Validate active staff report link token (for photo upload). */
export async function assertDailyReportUploadToken(
  staffIdHint: string,
  token: string,
) {
  const link = await getLinkByTokenOrCode(token);
  if (!link || !link.isActive) {
    throw new DailyActivityError("Token tidak valid", "INVALID_TOKEN", 403);
  }
  const expected = staffIdHint.replace(/^daily-/, "");
  if (expected && link.staffId !== expected) {
    throw new DailyActivityError(
      "Token tidak cocok dengan staff",
      "INVALID_TOKEN",
      403,
    );
  }
  return link;
}

const submissionInclude = {
  staff: { include: { outlet: true } },
  outlet: true,
  template: true,
  answers: { include: { item: true } },
} as const;

export async function getSubmissionById(
  id: string,
): Promise<DailyReportSubmission | null> {
  const row = await prisma.dailyReportSubmission.findUnique({
    where: { id },
    include: submissionInclude,
  });
  return row ? mapDailySubmission(row) : null;
}

export async function listSubmissionsNeedingFix(
  date?: string,
): Promise<DailyReportSubmission[]> {
  const reportDate = parseDateOnly(date || todayISO());
  const rows = await prisma.dailyReportSubmission.findMany({
    where: {
      reportDate,
      leaderValidation: { in: ["revisi", "tidak_valid", "manipulasi"] },
    },
    include: submissionInclude,
    orderBy: { submittedAt: "desc" },
  });
  return rows.map(mapDailySubmission);
}

export async function applyLeaderValidation(payload: {
  submission_id: string;
  validation: StaffReportValidationStatus;
  note?: string;
  leader_id?: string;
  leader_name?: string;
  photo_base64?: string;
}): Promise<
  | { success: true; data: DailyReportSubmission }
  | { success: false; error: string }
> {
  const valid: StaffReportValidationStatus[] = [
    "valid",
    "revisi",
    "tidak_valid",
    "manipulasi",
  ];
  if (!valid.includes(payload.validation)) {
    return { success: false, error: "Status validasi tidak valid." };
  }

  if (payload.validation !== "valid" && !(payload.note || "").trim()) {
    return {
      success: false,
      error: "Catatan wajib jika Revisi / Tidak valid / Manipulasi.",
    };
  }

  const existing = await prisma.dailyReportSubmission.findUnique({
    where: { id: payload.submission_id },
  });
  if (!existing) {
    return { success: false, error: "Laporan staff tidak ditemukan." };
  }

  const now = new Date();
  const updated = await prisma.dailyReportSubmission.update({
    where: { id: payload.submission_id },
    data: {
      leaderValidation: payload.validation,
      leaderValidationNote: (payload.note || "").trim() || null,
      leaderValidatedAt: now,
      leaderValidatedBy: payload.leader_id || "LEADER",
      leaderValidatedByName: payload.leader_name || "Leader",
      leaderValidationPhotoUrl: payload.photo_base64 || null,
    },
    include: submissionInclude,
  });

  return { success: true, data: mapDailySubmission(updated) };
}

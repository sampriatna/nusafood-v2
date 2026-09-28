import type { ReportConditionStatus } from "@nusafood/types";
import { prisma } from "@/lib/db";
import { todayKeyInAppTz } from "@/lib/format-datetime";
import {
  normalizeWorkShiftCode,
  parseSopDescription,
  shiftCodesForOutlet,
  templateAppliesToShift,
  type WorkShiftCode,
} from "@/lib/daily-activity-sop";
import { resolveStaffPositionGroup } from "@/lib/position-groups";
import {
  getStaffWorkShift,
  setStaffWorkShift,
} from "@/lib/services/staff-job-profile.service";

export class DailyActivityShiftError extends Error {
  constructor(
    message: string,
    public code = "SHIFT_VALIDATION",
    public status = 400,
  ) {
    super(message);
  }
}

async function getActiveLink(tokenOrCode: string) {
  const key = tokenOrCode.trim();
  if (!key) {
    throw new DailyActivityShiftError("Link tidak valid", "INVALID_TOKEN", 400);
  }
  const link = await prisma.staffReportLink.findFirst({
    where: {
      OR: [
        { token: key },
        { token: { equals: key, mode: "insensitive" } },
        { shortCode: key.toLowerCase() },
      ],
    },
    include: { staff: { include: { outlet: { select: { code: true } } } } },
  });
  if (!link) {
    throw new DailyActivityShiftError(
      "Link tidak ditemukan. Hubungi atasan Anda.",
      "LINK_NOT_FOUND",
      404,
    );
  }
  if (!link.isActive || link.staff.status !== "ACTIVE") {
    throw new DailyActivityShiftError(
      "Link atau staff sudah tidak aktif.",
      "LINK_INACTIVE",
      403,
    );
  }
  return link;
}

export async function getStaffReportShift(tokenOrCode: string): Promise<{
  shift_code: WorkShiftCode | null;
  is_waiter: boolean;
  /** Pilihan shift untuk outlet staff (KBU 1K/2K/3K/1LK, Kisamen 1R/2R/1LR, Samtaro 1S). */
  shift_options: WorkShiftCode[];
}> {
  const link = await getActiveLink(tokenOrCode);
  return {
    shift_code: await getStaffWorkShift(link.staffId),
    is_waiter: resolveStaffPositionGroup(link.staff.position ?? "") === "Waiters",
    shift_options: shiftCodesForOutlet(link.staff.outlet?.code),
  };
}

/**
 * Fallback jika leader belum mengisi jadwal. Sekali shift tersimpan, staff tidak
 * boleh menggantinya sendiri; koreksi dilakukan leader/admin dari Jadwal Mingguan.
 */
export async function setStaffReportShift(input: {
  token: string;
  shiftCode: unknown;
}): Promise<WorkShiftCode> {
  const link = await getActiveLink(input.token);
  if (resolveStaffPositionGroup(link.staff.position ?? "") !== "Waiters") {
    throw new DailyActivityShiftError(
      "Pilihan shift SOP saat ini khusus posisi Waiter.",
      "SHIFT_NOT_APPLICABLE",
      422,
    );
  }
  const allowed = shiftCodesForOutlet(link.staff.outlet?.code);
  const next = normalizeWorkShiftCode(input.shiftCode);
  if (!next || !allowed.includes(next)) {
    throw new DailyActivityShiftError(
      `Pilih shift ${allowed.join(" / ")}.`,
      "INVALID_SHIFT",
      422,
    );
  }

  const today = todayKeyInAppTz();
  const current = await getStaffWorkShift(link.staffId, today);
  if (current) {
    if (current !== next) {
      throw new DailyActivityShiftError(
        `Shift hari ini sudah ditetapkan ${current}. Koreksi shift hanya bisa dilakukan leader/admin dari Jadwal Mingguan.`,
        "SHIFT_LOCKED",
        409,
      );
    }
    return current;
  }

  return setStaffWorkShift({
    staffId: link.staffId,
    shiftCode: next,
    date: today,
    actor: `staff-fallback:${link.staffId}`,
  });
}

export async function validateStaffReportSubmissionPolicy(input: {
  token: string;
  reportTemplateId: string;
  statusCondition: ReportConditionStatus;
  checklistAnswers: { checklist_item_id: string; checked: boolean }[];
}): Promise<void> {
  const link = await getActiveLink(input.token);
  const template = await prisma.reportTemplate.findUnique({
    where: { id: input.reportTemplateId },
    include: { items: true },
  });
  if (!template) {
    throw new DailyActivityShiftError(
      "Kegiatan tidak ditemukan.",
      "TEMPLATE_NOT_FOUND",
      404,
    );
  }

  const meta = parseSopDescription(template.description);
  if (meta.shift_codes?.length) {
    const shift = await getStaffWorkShift(link.staffId);
    if (!shift) {
      throw new DailyActivityShiftError(
        "Pilih shift kerja hari ini sebelum mengisi SOP.",
        "SHIFT_REQUIRED",
        422,
      );
    }
    if (!templateAppliesToShift(meta.shift_codes, shift, template.category)) {
      throw new DailyActivityShiftError(
        `Kegiatan ini bukan kewajiban Shift ${shift}. Muat ulang halaman SOP.`,
        "WRONG_SHIFT_TEMPLATE",
        403,
      );
    }
  }

  if (input.statusCondition === "aman") {
    const answerMap = new Map(
      input.checklistAnswers.map((answer) => [
        answer.checklist_item_id,
        answer.checked,
      ]),
    );
    const incomplete = template.items.filter(
      (item) => item.isRequired && !answerMap.get(item.id),
    );
    if (incomplete.length) {
      throw new DailyActivityShiftError(
        "Status Aman hanya bisa dipilih jika seluruh langkah wajib selesai. Jika ada yang belum bisa dikerjakan, pilih status kendala dan jelaskan kondisinya.",
        "REQUIRED_STEPS_INCOMPLETE",
        422,
      );
    }
  }
}

import { prisma } from "@/lib/db";
import { DAILY_ACTIVITY_SEED_TEMPLATES } from "@/lib/daily-activity-seed";
import {
  DAILY_ACTIVITY_OPERATIONAL_OVERRIDES,
  DEPRECATED_DAILY_ACTIVITY_TEMPLATE_CODES,
} from "@/lib/daily-activity-operational-overrides";
export { listPositionDailyTemplateSummary } from "@/lib/daily-activity-seed";

export class DailyActivitySeedError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function parseTime(value?: string): Date | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  return new Date(Date.UTC(1970, 0, 1, hh, mm, 0));
}

export type DailyActivitySeedResult = {
  templates: number;
  codes: string[];
  position_groups: string[];
  deprecated_templates: number;
};

function normalizeChecklistText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function getEffectiveSeedTemplates() {
  const byCode = new Map(
    DAILY_ACTIVITY_SEED_TEMPLATES.map((def) => [def.code, def] as const),
  );
  for (const override of DAILY_ACTIVITY_OPERATIONAL_OVERRIDES) {
    byCode.set(override.code, override);
  }
  return [...byCode.values()];
}

async function syncTemplateChecklist(
  templateId: string,
  checklist: string[],
) {
  const normalized = checklist.map(normalizeChecklistText).filter(Boolean);
  if (!normalized.length) return;

  const existingItems = await prisma.reportTemplateChecklistItem.findMany({
    where: { reportTemplateId: templateId },
    include: { _count: { select: { answers: true } } },
  });

  const hasAnswers = existingItems.some((item) => item._count.answers > 0);

  if (!hasAnswers) {
    await prisma.reportTemplateChecklistItem.deleteMany({
      where: { reportTemplateId: templateId },
    });
    await prisma.reportTemplateChecklistItem.createMany({
      data: normalized.map((text, index) => ({
        reportTemplateId: templateId,
        itemText: text,
        isRequired: true,
        sortOrder: index + 1,
      })),
    });
    return;
  }

  // Jika sudah punya histori jawaban, jangan hapus checklist lama karena akan
  // merusak audit trail. Tambahkan / urutkan item baru saja.
  const existingByText = new Map(
    existingItems.map((item) => [
      normalizeChecklistText(item.itemText).toLowerCase(),
      item,
    ]),
  );

  for (let index = 0; index < normalized.length; index++) {
    const text = normalized[index]!;
    const key = text.toLowerCase();
    const found = existingByText.get(key);
    if (found) {
      if (found.sortOrder !== index + 1) {
        await prisma.reportTemplateChecklistItem.update({
          where: { id: found.id },
          data: { sortOrder: index + 1 },
        });
      }
      continue;
    }
    await prisma.reportTemplateChecklistItem.create({
      data: {
        reportTemplateId: templateId,
        itemText: text,
        isRequired: true,
        sortOrder: index + 1,
      },
    });
  }
}

/** Upsert template kegiatan harian + checklist dari seed bawaan repo. */
export async function seedDailyActivityTemplates(): Promise<DailyActivitySeedResult> {
  const outlets = await prisma.outlet.findMany();
  if (!outlets.length) {
    throw new DailyActivitySeedError(
      "Outlet belum ada. Jalankan db:seed atau sync v1 dulu.",
      "OUTLETS_MISSING",
      422,
    );
  }

  const outletByCode = new Map(outlets.map((o) => [o.code, o]));
  const codes: string[] = [];
  const positionGroups = new Set<string>();
  const effectiveTemplates = getEffectiveSeedTemplates();

  for (const def of effectiveTemplates) {
    const outletId = def.outlet_code
      ? (outletByCode.get(def.outlet_code)?.id ?? null)
      : null;

    const template = await prisma.reportTemplate.upsert({
      where: { code: def.code },
      create: {
        code: def.code,
        title: def.title,
        category: def.category,
        outletId,
        positionGroup: def.position_group,
        standardResult: def.standard_result,
        description: def.standard_result,
        requiresPhoto: def.requires_photo,
        isRequiredDaily: def.is_required_daily,
        kind:
          def.kind ??
          (def.is_required_daily ? "daily_required" : "special_task"),
        targetTimeStart: parseTime(def.target_time_start),
        targetTimeEnd: parseTime(def.target_time_end),
        active: true,
        sortOrder: def.sort_order,
      },
      update: {
        title: def.title,
        category: def.category,
        outletId,
        positionGroup: def.position_group,
        standardResult: def.standard_result,
        description: def.standard_result,
        requiresPhoto: def.requires_photo,
        isRequiredDaily: def.is_required_daily,
        kind:
          def.kind ??
          (def.is_required_daily ? "daily_required" : "special_task"),
        targetTimeStart: parseTime(def.target_time_start),
        targetTimeEnd: parseTime(def.target_time_end),
        active: true,
        sortOrder: def.sort_order,
      },
    });

    await syncTemplateChecklist(template.id, def.checklist);

    codes.push(def.code);
    if (def.position_group) {
      positionGroups.add(def.position_group);
    }
  }

  const deprecated = await prisma.reportTemplate.updateMany({
    where: {
      code: { in: [...DEPRECATED_DAILY_ACTIVITY_TEMPLATE_CODES] },
    },
    data: {
      active: false,
      isRequiredDaily: false,
      kind: "special_task",
    },
  });

  return {
    templates: effectiveTemplates.length,
    codes,
    position_groups: [...positionGroups].sort(),
    deprecated_templates: deprecated.count,
  };
}

/** Isi database otomatis jika belum ada template (first-run admin). */
export async function ensureDailyActivityTemplatesSeeded(): Promise<{
  seeded: boolean;
  result?: DailyActivitySeedResult;
}> {
  const count = await prisma.reportTemplate.count();
  if (count > 0) {
    return { seeded: false };
  }
  const result = await seedDailyActivityTemplates();
  return { seeded: true, result };
}

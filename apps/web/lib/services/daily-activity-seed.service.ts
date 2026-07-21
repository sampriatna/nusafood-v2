import { prisma } from "@/lib/db";
import { DAILY_ACTIVITY_SEED_TEMPLATES } from "@/lib/daily-activity-seed";
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
};

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

  for (const def of DAILY_ACTIVITY_SEED_TEMPLATES) {
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

    await prisma.reportTemplateChecklistItem.deleteMany({
      where: { reportTemplateId: template.id },
    });

    if (def.checklist.length) {
      await prisma.reportTemplateChecklistItem.createMany({
        data: def.checklist.map((text, index) => ({
          reportTemplateId: template.id,
          itemText: text,
          isRequired: true,
          sortOrder: index + 1,
        })),
      });
    }

    codes.push(def.code);
    if (def.position_group) {
      positionGroups.add(def.position_group);
    }
  }

  return {
    templates: DAILY_ACTIVITY_SEED_TEMPLATES.length,
    codes,
    position_groups: [...positionGroups].sort(),
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


/** Shared type for daily activity seed definitions. */
import type { ReportTemplateCategory, ReportTemplateKind } from "@nusafood/types";

export type DailyActivitySeedDef = {
  code: string;
  title: string;
  category: ReportTemplateCategory;
  position_group: string | null;
  outlet_code?: string | null;
  standard_result: string;
  requires_photo: boolean;
  is_required_daily: boolean;
  kind?: ReportTemplateKind;
  target_time_start?: string;
  target_time_end?: string;
  sort_order: number;
  checklist: string[];
};

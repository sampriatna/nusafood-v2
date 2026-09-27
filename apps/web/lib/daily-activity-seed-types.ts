/** Shared type for daily activity seed definitions. */
import type { ReportTemplateCategory, ReportTemplateKind } from "@nusafood/types";
import type { WorkShiftCode } from "./daily-activity-sop";

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
  /** Copy instruction-first untuk SOP Digital staff. */
  why_text?: string;
  operational_impact?: string;
  instruction_note?: string;
  /** Jika diisi, template hanya menjadi kewajiban staff pada shift ini. */
  shift_codes?: WorkShiftCode[];
};

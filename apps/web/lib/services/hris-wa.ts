/** Placeholder WA when HRIS phone is empty — must not be used for task assignment. */
export const WA_NEEDS_COMPLETION_PREFIX = "NEEDS-WA-";

export function placeholderWaForHris(hrisStaffId: string): string {
  const suffix = hrisStaffId.replace(/\D/g, "").slice(-8).padStart(8, "0");
  return `${WA_NEEDS_COMPLETION_PREFIX}${suffix}`;
}

export function isWaNeedsCompletion(waNumber: string): boolean {
  return waNumber.startsWith(WA_NEEDS_COMPLETION_PREFIX);
}

export function staffWaReadyForAssignment(input: {
  waNumber: string;
  waNeedsCompletion?: boolean | null;
}): boolean {
  if (input.waNeedsCompletion) return false;
  if (!input.waNumber?.trim()) return false;
  if (isWaNeedsCompletion(input.waNumber)) return false;
  return true;
}

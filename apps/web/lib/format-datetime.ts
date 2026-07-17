/** Waktu operasional Nusa Food — selalu WIB (Asia/Jakarta). */
export const APP_TIMEZONE = "Asia/Jakarta";

function toDate(value: Date | string | number): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTimeId(
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = toDate(value);
  if (!date) return "—";
  return date.toLocaleString("id-ID", {
    timeZone: APP_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}

export function formatDateId(value: Date | string | number): string {
  const date = toDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("id-ID", {
    timeZone: APP_TIMEZONE,
    day: "numeric",
    month: "short",
  });
}

export function formatTimeId(value: Date | string | number): string {
  const date = toDate(value);
  if (!date) return "—";
  return date.toLocaleTimeString("id-ID", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** YYYY-MM-DD in WIB — untuk filter deadline / periode. */
export function dateKeyInAppTz(value: Date | string | number): string {
  const date = toDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function todayKeyInAppTz(): string {
  return dateKeyInAppTz(new Date());
}

/** Parse YYYY-MM-DD as noon UTC (aman untuk aritmetika hari tanpa DST). */
function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function addDaysToDateKey(key: string, days: number): string {
  const dt = parseDateKey(key);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dateKeyInAppTz(dt);
}

function weekdayInAppTz(value: Date | string | number): number {
  const date = toDate(value);
  if (!date) return 0;
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    weekday: "short",
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
}

/** Senin–Minggu dalam WIB (YYYY-MM-DD). */
export function weekRangeKeysInAppTz(
  ref: Date | string | number = new Date(),
): { start: string; end: string } {
  const todayKey = dateKeyInAppTz(ref);
  const mondayOffset = (weekdayInAppTz(ref) + 6) % 7;
  const start = addDaysToDateKey(todayKey, -mondayOffset);
  const end = addDaysToDateKey(start, 6);
  return { start, end };
}

export function monthKeyInAppTz(value: Date | string | number = new Date()): string {
  return dateKeyInAppTz(value).slice(0, 7);
}

export function isDateKeyInRange(
  key: string,
  start: string,
  end: string,
): boolean {
  return key >= start && key <= end;
}

/** Label singkat zona waktu untuk UI */
export function timezoneLabel(): string {
  return "WIB";
}

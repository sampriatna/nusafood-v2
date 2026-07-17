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

/** Label singkat zona waktu untuk UI */
export function timezoneLabel(): string {
  return "WIB";
}

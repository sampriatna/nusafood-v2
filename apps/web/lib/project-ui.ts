import type { MilestoneStatus, ProjectHealth, ProjectStatus } from "@/lib/project-types";

export type ApiEnvelope<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string; code?: string };

/** fetch JSON ber-envelope; melempar Error dengan pesan server bila gagal. */
export async function apiCall<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
  });
  let json: ApiEnvelope<T>;
  try {
    json = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error("Respons server tidak terbaca. Coba lagi.");
  }
  if (!json.success) throw new Error(json.error || "Terjadi kesalahan");
  return json.data;
}

export const MILESTONE_LABEL: Record<MilestoneStatus, string> = {
  NOT_STARTED: "Belum mulai",
  IN_PROGRESS: "Sedang dikerjakan",
  WAITING_VALIDATION: "Menunggu validasi",
  REVISION: "Perlu revisi",
  DONE: "Disetujui",
  BLOCKED: "Terhambat",
};

export function milestoneBadgeClass(status: MilestoneStatus): string {
  switch (status) {
    case "DONE":
      return "bg-emerald-100 text-emerald-800";
    case "WAITING_VALIDATION":
      return "bg-sky-100 text-sky-800";
    case "REVISION":
    case "BLOCKED":
      return "bg-red-100 text-red-800";
    case "IN_PROGRESS":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export const HEALTH_LABEL: Record<ProjectHealth, string> = {
  ON_TRACK: "On Track",
  NEED_ATTENTION: "Perlu Perhatian",
  BLOCKED: "Blocked",
  COMPLETED: "Selesai",
};

export function healthBadgeClass(health: ProjectHealth): string {
  switch (health) {
    case "ON_TRACK":
      return "bg-emerald-100 text-emerald-800";
    case "NEED_ATTENTION":
      return "bg-amber-100 text-amber-800";
    case "BLOCKED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  ACTIVE: "Aktif",
  PAUSED: "Dijeda",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export function formatDeadline(value: string | null): string {
  if (!value) return "Tanpa deadline";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
}

export function formatStamp(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function absoluteUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

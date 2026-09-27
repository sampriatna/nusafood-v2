import type { Task } from "@nusafood/types";

const DELETABLE_STATUSES = ["CREATED", "SENT", "WA_FAILED"];

/**
 * Cermin aturan server (deleteTask): tugas yang sudah dibuka, dilaporkan,
 * atau diverifikasi disimpan sebagai histori dan tidak bisa dihapus.
 */
export function isTaskDeletable(task: Pick<Task, "status" | "opened_at" | "submitted_at" | "verified_at">): boolean {
  if (task.opened_at || task.submitted_at || task.verified_at) return false;
  return DELETABLE_STATUSES.includes(task.status);
}

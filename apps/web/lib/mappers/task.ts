import type { Task as DbTask } from "@nusafood/database";
import type { Task, TaskPriority, TaskStatus } from "@nusafood/types";

function iso(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString() : undefined;
}

export function mapTaskToApi(task: DbTask): Task {
  return {
    task_id: task.taskId,
    token: task.token,
    created_at: task.createdAt.toISOString(),
    created_by: task.createdBy ?? "",
    outlet: task.outletName ?? "",
    area: task.areaName ?? "",
    category: task.categoryName ?? "",
    task_title: task.taskTitle,
    task_description: task.taskDescription ?? "",
    priority: task.priority as TaskPriority,
    pic_name: task.picName,
    pic_wa: task.picWa,
    staff_id: task.staffId ?? undefined,
    deadline: task.deadline.toISOString(),
    before_photo_url: task.beforePhotoUrl ?? undefined,
    status: task.status as TaskStatus,
    report_link: task.reportLink ?? "",
    wa_sent_at: iso(task.waSentAt),
    opened_at: iso(task.openedAt),
    submitted_at: iso(task.submittedAt),
    after_photo_url: task.afterPhotoUrl ?? undefined,
    staff_note: task.staffNote ?? undefined,
    leader_verification: task.leaderVerification ?? undefined,
    verified_by: task.verifiedBy ?? undefined,
    verified_at: iso(task.verifiedAt),
    final_status: task.finalStatus ?? undefined,
    is_late: task.isLate,
    duration_minutes: task.durationMinutes ?? undefined,
    last_updated: task.updatedAt.toISOString(),
    checklist_mode: task.checklistMode,
    source_version: task.sourceVersion === "v1" ? "v1" : "v2",
  };
}

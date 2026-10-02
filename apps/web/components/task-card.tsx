"use client";

import type { Task } from "@nusafood/types";
import Link from "next/link";
import { ChevronRight, Clock, Loader2, MapPin, Trash2, User } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { outletShortName } from "@/lib/outlet-codes";
import { isTaskDeletable } from "@/lib/task-rules";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  formatDateId,
  formatTimeId,
} from "@/lib/format-datetime";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  className?: string;
  canDelete?: boolean;
  deleting?: boolean;
  onDelete?: (task: Task) => void | Promise<void>;
}

const priorityColors: Record<string, string> = {
  Low: "border-l-slate-400",
  Medium: "border-l-blue-500",
  High: "border-l-orange-500",
  Urgent: "border-l-red-600",
};

export function TaskCard({
  task,
  className,
  canDelete = false,
  deleting = false,
  onDelete,
}: TaskCardProps) {
  const deadlineDate = new Date(task.deadline);
  const openStatuses = ["CREATED", "SENT", "OPEN", "OPENED", "WA_FAILED"];
  const isOverdue =
    new Date() > deadlineDate && openStatuses.includes(task.status);

  return (
    <Card
      className={cn(
        "overflow-hidden border-l-4 p-0 transition-colors",
        priorityColors[task.priority] || "border-l-slate-400",
        className,
      )}
    >
      <div className="flex items-stretch">
        <Link
          href={`/tasks/${task.task_id}`}
          className="block min-w-0 flex-1 hover:bg-muted/50"
        >
          <div className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {task.task_id}
                  </span>
                  <StatusBadge status={task.status} />
                </div>
                <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">
                  {task.task_title}
                </h3>
              </div>
              <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            </div>

            <div className="mt-2 space-y-1 text-[13px]">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                <span className="flex min-w-0 items-center gap-1.5">
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="truncate">
                    {outletShortName(task.outlet)}{task.area ? ` · ${task.area}` : ""}
                  </span>
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <User className="size-3.5 shrink-0" />
                  <span className="truncate">{task.pic_name}</span>
                </span>
              </div>
              <div
                className={cn(
                  "flex items-center gap-1.5",
                  isOverdue ? "font-medium text-red-600" : "text-muted-foreground",
                )}
              >
                <Clock className="size-3.5 shrink-0" />
                <span>
                  {formatDateId(deadlineDate)}{" "}
                  {formatTimeId(deadlineDate)} WIB
                  {isOverdue ? " · Terlambat" : ""}
                </span>
              </div>
            </div>
          </div>
        </Link>

        {canDelete && onDelete && isTaskDeletable(task) ? (
          <>
            <div className="w-px bg-border" />
            <div className="flex w-12 shrink-0 items-center justify-center">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    disabled={deleting}
                    aria-label={`Hapus tugas ${task.task_id}`}
                  >
                    {deleting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hapus tugas?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {task.task_id} — {task.task_title} akan dihapus dari
                      daftar jika belum memiliki aktivitas atau laporan staff.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => void onDelete(task)}
                    >
                      Hapus
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        ) : null}
      </div>
    </Card>
  );
}

export function TaskCardSkeleton() {
  return (
    <Card className="border-l-4 border-l-slate-200 p-4">
      <div className="animate-pulse">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-4 w-16 rounded bg-muted" />
          <div className="h-5 w-16 rounded-full bg-muted" />
        </div>
        <div className="mb-3 h-5 w-3/4 rounded bg-muted" />
        <div className="space-y-2">
          <div className="h-4 w-1/2 rounded bg-muted" />
          <div className="h-4 w-1/3 rounded bg-muted" />
          <div className="h-4 w-2/5 rounded bg-muted" />
        </div>
      </div>
    </Card>
  );
}

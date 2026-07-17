"use client";

import type { Task } from "@nusafood/types";
import Link from "next/link";
import { ChevronRight, Clock, MapPin, User } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import {
  dateKeyInAppTz,
  formatDateId,
  formatTimeId,
} from "@/lib/format-datetime";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  className?: string;
}

const priorityColors: Record<string, string> = {
  Low: "border-l-slate-400",
  Medium: "border-l-blue-500",
  High: "border-l-orange-500",
  Urgent: "border-l-red-600",
};

export function TaskCard({ task, className }: TaskCardProps) {
  const deadlineDate = new Date(task.deadline);
  const openStatuses = ["CREATED", "SENT", "OPEN", "OPENED", "WA_FAILED"];
  const isOverdue =
    new Date() > deadlineDate && openStatuses.includes(task.status);

  return (
    <Card
      className={cn(
        "cursor-pointer overflow-hidden border-l-4 p-0 transition-colors hover:bg-muted/50",
        priorityColors[task.priority] || "border-l-slate-400",
        className,
      )}
    >
      <Link href={`/tasks/${task.task_id}`} className="block">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {task.task_id}
                </span>
                <StatusBadge status={task.status} />
              </div>
              <h3 className="truncate text-base font-semibold text-foreground">
                {task.task_title}
              </h3>
            </div>
            <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" />
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" />
              <span className="truncate">
                {task.outlet} - {task.area}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="size-4 shrink-0" />
              <span className="truncate">{task.pic_name}</span>
            </div>
            <div
              className={cn(
                "flex items-center gap-2 text-sm",
                isOverdue ? "font-medium text-red-600" : "text-muted-foreground",
              )}
            >
              <Clock className="size-4 shrink-0" />
              <span>
                {formatDateId(deadlineDate)}{" "}
                {formatTimeId(deadlineDate)} WIB
              </span>
            </div>
          </div>
        </div>
      </Link>
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

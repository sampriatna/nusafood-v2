"use client";

import type { ChecklistSummary, DashboardSummary } from "@nusafood/types";
import { Card } from "@/components/ui/card";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  ListChecks,
  RotateCcw,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardSummaryCardsProps {
  summary: DashboardSummary;
  isLoading?: boolean;
  activeKey?: string;
  onStatusClick?: (status: string) => void;
}

interface SummaryCard {
  key: keyof DashboardSummary;
  label: string;
  icon: React.ReactNode;
  className: string;
  textClass: string;
}

const cards: SummaryCard[] = [
  {
    key: "total",
    label: "Total Tugas",
    icon: <ClipboardList className="h-5 w-5" />,
    className: "bg-slate-50 border-slate-200",
    textClass: "text-slate-700",
  },
  {
    key: "open",
    label: "Belum Selesai",
    icon: <Clock className="h-5 w-5" />,
    className: "bg-blue-50 border-blue-200",
    textClass: "text-blue-700",
  },
  {
    key: "submitted",
    label: "Dilaporkan",
    icon: <Send className="h-5 w-5" />,
    className: "bg-amber-50 border-amber-200",
    textClass: "text-amber-700",
  },
  {
    key: "done",
    label: "Selesai",
    icon: <CheckCircle2 className="h-5 w-5" />,
    className: "bg-emerald-50 border-emerald-200",
    textClass: "text-emerald-700",
  },
  {
    key: "late",
    label: "Terlambat",
    icon: <AlertTriangle className="h-5 w-5" />,
    className: "bg-red-50 border-red-200",
    textClass: "text-red-700",
  },
  {
    key: "revisi",
    label: "Perlu Revisi",
    icon: <RotateCcw className="h-5 w-5" />,
    className: "bg-orange-50 border-orange-200",
    textClass: "text-orange-700",
  },
];

export function DashboardSummaryCards({
  summary,
  isLoading = false,
  activeKey,
  onStatusClick,
}: DashboardSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
        {cards.map((card) => (
          <Card key={card.key} className={cn("gap-0 border p-2.5", card.className)}>
            <div className="animate-pulse">
              <div className="mb-2 h-3 w-12 rounded bg-slate-200" />
              <div className="h-6 w-8 rounded bg-slate-200" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.key}
          onClick={() => onStatusClick?.(card.key)}
          className={cn(
            "cursor-pointer rounded-xl transition-all hover:shadow-md",
            activeKey === card.key && "ring-2 ring-primary ring-offset-2",
          )}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onStatusClick?.(card.key);
            }
          }}
        >
          <Card className={cn("h-full gap-0 border p-2.5", card.className)}>
            <div className="flex items-center justify-between gap-1">
              <p className={cn("text-xl font-bold leading-none tabular-nums", card.textClass)}>
                {summary[card.key]}
              </p>
              <span className={cn("[&>svg]:size-4 opacity-80", card.textClass)}>{card.icon}</span>
            </div>
            <p className={cn("mt-1.5 text-[11px] font-medium leading-tight", card.textClass)}>
              {card.label}
            </p>
          </Card>
        </div>
      ))}
    </div>
  );
}

interface ChecklistSummaryCardsProps {
  summary: ChecklistSummary;
  isLoading?: boolean;
  activeKey?: string;
  onStatusClick?: (status: string) => void;
}

const checklistCards: SummaryCard[] = [
  {
    key: "total",
    label: "Total Checklist",
    icon: <ListChecks className="h-5 w-5" />,
    className: "bg-slate-50 border-slate-200",
    textClass: "text-slate-700",
  },
  {
    key: "open",
    label: "Belum Dikerjakan",
    icon: <Clock className="h-5 w-5" />,
    className: "bg-blue-50 border-blue-200",
    textClass: "text-blue-700",
  },
  {
    key: "submitted",
    label: "Sudah Submit",
    icon: <Send className="h-5 w-5" />,
    className: "bg-amber-50 border-amber-200",
    textClass: "text-amber-700",
  },
  {
    key: "done",
    label: "Selesai",
    icon: <CheckCircle2 className="h-5 w-5" />,
    className: "bg-emerald-50 border-emerald-200",
    textClass: "text-emerald-700",
  },
  {
    key: "late",
    label: "Telat",
    icon: <AlertTriangle className="h-5 w-5" />,
    className: "bg-red-50 border-red-200",
    textClass: "text-red-700",
  },
  {
    key: "revisi",
    label: "Perlu Revisi",
    icon: <RotateCcw className="h-5 w-5" />,
    className: "bg-orange-50 border-orange-200",
    textClass: "text-orange-700",
  },
];

export function ChecklistSummaryCards({
  summary,
  isLoading = false,
  activeKey,
  onStatusClick,
}: ChecklistSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
        {checklistCards.map((card) => (
          <Card key={card.key} className={cn("gap-0 border p-2.5", card.className)}>
            <div className="animate-pulse">
              <div className="mb-2 h-3 w-12 rounded bg-slate-200" />
              <div className="h-6 w-8 rounded bg-slate-200" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
      {checklistCards.map((card) => (
        <div
          key={card.key}
          onClick={() => onStatusClick?.(card.key)}
          className={cn(
            "cursor-pointer rounded-xl transition-all hover:shadow-md",
            activeKey === card.key && "ring-2 ring-primary ring-offset-2",
          )}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onStatusClick?.(card.key);
            }
          }}
        >
          <Card className={cn("h-full gap-0 border p-2.5", card.className)}>
            <div className="flex items-center justify-between gap-1">
              <p className={cn("text-xl font-bold leading-none tabular-nums", card.textClass)}>
                {summary[card.key]}
              </p>
              <span className={cn("[&>svg]:size-4 opacity-80", card.textClass)}>{card.icon}</span>
            </div>
            <p className={cn("mt-1.5 text-[11px] font-medium leading-tight", card.textClass)}>
              {card.label}
            </p>
          </Card>
        </div>
      ))}
    </div>
  );
}

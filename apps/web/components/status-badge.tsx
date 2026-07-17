"use client";

import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  CREATED: {
    label: "Dibuat",
    className: "bg-slate-100 text-slate-800 border-slate-200",
  },
  SENT: {
    label: "Terkirim",
    className: "bg-sky-100 text-sky-800 border-sky-200",
  },
  WA_FAILED: {
    label: "WA Gagal",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  OPEN: {
    label: "Belum Dikerjakan",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  OPENED: {
    label: "Dibuka",
    className: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  SUBMITTED: {
    label: "Terkirim",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  RESUBMITTED: {
    label: "Disubmit Ulang",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  WAITING_VERIFICATION: {
    label: "Menunggu Verifikasi",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  DONE: {
    label: "Selesai",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  VERIFIED: {
    label: "Terverifikasi",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  REVISI: {
    label: "Perlu Revisi",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  REVISION: {
    label: "Perlu Revisi",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  REVISION_REQUESTED: {
    label: "Perlu Revisi",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  LATE: {
    label: "Terlambat",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  WA_SENT: {
    label: "WA Terkirim",
    className: "bg-sky-100 text-sky-800 border-sky-200",
  },
  PENDING: {
    label: "Belum Dikerjakan",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
  COMPLETED: {
    label: "Selesai",
    className: "bg-green-100 text-green-800 border-green-200",
  },
};

const fallbackConfig = {
  label: "Unknown",
  className: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = (status || "").toUpperCase();
  const config = statusConfig[normalized] ?? {
    label: status || fallbackConfig.label,
    className: fallbackConfig.className,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

export type StatTone = "neutral" | "green" | "amber" | "red" | "sky";

const toneClass: Record<StatTone, string> = {
  neutral: "border-border bg-card text-foreground",
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  red: "border-red-200 bg-red-50 text-red-800",
  sky: "border-sky-200 bg-sky-50 text-sky-900",
};

/** Kotak angka ringkas: angka besar + label kecil. Dipakai di halaman ringkasan. */
export function StatTile({
  label,
  value,
  tone = "neutral",
  icon: Icon,
  hint,
  className,
}: {
  label: string;
  value?: number | string | null;
  tone?: StatTone;
  icon?: ComponentType<{ className?: string }>;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border px-3 py-2.5", toneClass[tone], className)}>
      <div className="flex items-center justify-between gap-1">
        <p className="text-xl font-bold leading-none tabular-nums">{value ?? "–"}</p>
        {Icon ? <Icon className="size-4 shrink-0 opacity-70" /> : null}
      </div>
      <p
        className={cn(
          "mt-1.5 text-[11px] font-medium leading-tight",
          tone === "neutral" && "text-muted-foreground",
        )}
      >
        {label}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] leading-tight opacity-70">{hint}</p> : null}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  MinusCircle,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatDateId, formatTimeId } from "@/lib/format-datetime";
import { OUTLET_FILTER_OPTIONS } from "@/lib/outlet-codes";
import { gradeOf, type GroupBy, type PerfBucket, type ScoreGrade } from "@/lib/performance";
import { cn } from "@/lib/utils";

type PerformancePeriod = "7d" | "30d" | "month" | "last_month";
type Bucket = PerfBucket & { letters?: number };
type PerformanceData = {
  period: PerformancePeriod;
  range: { start: string; end: string };
  group_by: GroupBy;
  overall: PerfBucket;
  buckets: Bucket[];
};

const PERIODS: { value: PerformancePeriod; label: string }[] = [
  { value: "7d", label: "7 hari" },
  { value: "30d", label: "30 hari" },
  { value: "month", label: "Bulan ini" },
  { value: "last_month", label: "Bulan lalu" },
];

const GROUPS: { value: GroupBy; label: string }[] = [
  { value: "person", label: "Per orang" },
  { value: "division", label: "Per divisi" },
  { value: "outlet", label: "Per outlet" },
];

/** Warna status (tetap, selalu berpasangan dengan label/ikon). */
const SEGMENTS = [
  { key: "on_time", label: "Tepat waktu", color: "#0ca30c" },
  { key: "late_done", label: "Terlambat", color: "#ec835a" },
  { key: "overdue", label: "Belum lapor (lewat deadline)", color: "#d03b3b" },
  { key: "in_progress", label: "Masih berjalan", color: "#cbd5e1" },
] as const;

const GRADE: Record<ScoreGrade, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  good: { label: "Baik", className: "bg-emerald-50 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
  warning: { label: "Cukup", className: "bg-amber-50 text-amber-900 border-amber-200", icon: AlertTriangle },
  critical: { label: "Perlu perhatian", className: "bg-red-50 text-red-800 border-red-200", icon: XCircle },
  none: { label: "Belum dinilai", className: "bg-slate-50 text-slate-600 border-slate-200", icon: MinusCircle },
};

function formatRange(range: { start: string; end: string }): string {
  const fmt = (k: string) =>
    new Date(`${k}T12:00:00+07:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  return `${fmt(range.start)} – ${fmt(range.end)}`;
}

export function PerformanceClient({ canPickOutlet }: { canPickOutlet: boolean }) {
  const { toast } = useToast();
  const [period, setPeriod] = useState<PerformancePeriod>("30d");
  const [group, setGroup] = useState<GroupBy>("person");
  const [outlet, setOutlet] = useState("");
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ period, group });
      if (outlet) params.set("outlet", outlet);
      const res = await fetch(`/api/performance?${params}`, { credentials: "include" });
      const json = (await res.json()) as { success: boolean; data?: PerformanceData; error?: string };
      if (!json.success || !json.data) {
        setError(json.error || "Gagal memuat data kinerja");
        return;
      }
      setData(json.data);
    } catch {
      setError("Periksa koneksi lalu coba lagi.");
      toast({ title: "Gagal memuat data kinerja", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [period, group, outlet, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const overall = data?.overall;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {PERIODS.map((p) => (
            <Chip key={p.value} active={period === p.value} onClick={() => setPeriod(p.value)}>
              {p.label}
            </Chip>
          ))}
          {canPickOutlet ? (
            <select
              value={outlet}
              onChange={(e) => setOutlet(e.target.value)}
              aria-label="Outlet"
              className="h-8 shrink-0 rounded-full border bg-background px-3 text-sm"
            >
              <option value="">Semua outlet</option>
              {OUTLET_FILTER_OPTIONS.filter((o) => o.value !== "ALL").map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <div className="grid grid-cols-3 rounded-lg bg-muted p-1">
          {GROUPS.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => setGroup(g.value)}
              className={cn(
                "rounded-md py-1.5 text-sm font-medium",
                group === g.value ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Card className="col-span-2">
          <CardContent className="flex items-end justify-between gap-3 p-4">
            <div>
              <p className="text-sm text-muted-foreground">Skor tepat waktu</p>
              <p className="text-4xl font-bold leading-tight">
                {loading ? "–" : overall?.score === null || overall?.score === undefined ? "–" : `${overall.score}%`}
              </p>
              <p className="text-xs text-muted-foreground">
                {data ? `Deadline ${formatRange(data.range)}` : " "}
              </p>
            </div>
            {overall ? <GradeBadge score={overall.score} /> : null}
          </CardContent>
        </Card>
        <Stat label="Total tugas" value={overall?.total} loading={loading} />
        <Stat label="Tepat waktu" value={overall?.on_time} loading={loading} />
        <Stat label="Terlambat" value={overall?.late_done} loading={loading} />
        <Stat label="Belum lapor, lewat deadline" value={overall?.overdue} loading={loading} />
      </div>

      <Legend />

      <section className="space-y-2">
        {loading ? (
          <p className="flex items-center gap-2 rounded-lg border p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Memuat…
          </p>
        ) : !data?.buckets.length ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Belum ada tugas dengan deadline di periode ini.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Diurutkan dari skor terendah — yang perlu perhatian ada di atas.
            </p>
            {data.buckets.map((b) => (
              <BucketRow key={b.key} bucket={b} showLetters={group === "person"} />
            ))}
          </>
        )}
      </section>

      <details className="rounded-lg border bg-card px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium">Cara menghitung skor</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Dihitung dari tugas yang <b>deadline-nya</b> jatuh di periode yang dipilih.</li>
          <li><b>Tepat waktu</b>: laporan masuk sebelum/pada deadline.</li>
          <li><b>Terlambat</b>: laporan masuk setelah deadline.</li>
          <li><b>Belum lapor</b>: deadline sudah lewat tapi belum ada laporan — dihitung terlambat.</li>
          <li>Tugas yang deadline-nya belum lewat tidak ikut dinilai.</li>
          <li>Skor = tepat waktu ÷ semua tugas yang sudah dinilai. Baik ≥ 90%, Cukup 75–89%, Perlu perhatian &lt; 75%.</li>
          <li>Divisi diambil dari jabatan utama staff di Master Staff.</li>
        </ul>
      </details>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 shrink-0 rounded-full border px-3 text-sm",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Stat({ label, value, loading }: { label: string; value?: number; loading: boolean }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{loading ? "–" : value ?? 0}</p>
      </CardContent>
    </Card>
  );
}

function GradeBadge({ score }: { score: number | null }) {
  const g = GRADE[gradeOf(score)];
  const Icon = g.icon;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", g.className)}>
      <Icon className="size-3.5" />
      {g.label}
    </span>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {SEGMENTS.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

function StackedBar({ bucket }: { bucket: PerfBucket }) {
  const parts = SEGMENTS.map((s) => ({ ...s, value: bucket[s.key] })).filter((p) => p.value > 0);
  if (!bucket.total) return <div className="h-2.5 rounded bg-muted" />;
  return (
    <div className="flex h-2.5 gap-0.5" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")}>
      {parts.map((p, i) => (
        <div
          key={p.key}
          title={`${p.label}: ${p.value}`}
          className={cn(i === 0 && "rounded-l", i === parts.length - 1 && "rounded-r")}
          style={{ flexGrow: p.value, flexBasis: 0, backgroundColor: p.color, minWidth: 4 }}
        />
      ))}
    </div>
  );
}

function BucketRow({ bucket, showLetters }: { bucket: Bucket; showLetters: boolean }) {
  const [open, setOpen] = useState(false);
  const late = bucket.late_done + bucket.overdue;
  const facts = [
    `${bucket.total} tugas`,
    `${bucket.on_time} tepat`,
    late ? `${late} telat` : null,
    bucket.overdue ? `${bucket.overdue} belum lapor` : null,
    bucket.revision ? `${bucket.revision} revisi` : null,
    showLetters && bucket.letters ? `${bucket.letters} teguran` : null,
  ].filter(Boolean);

  return (
    <Card>
      <CardContent className="space-y-2 p-3">
        <button
          type="button"
          className="flex w-full items-start justify-between gap-3 text-left"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          disabled={!bucket.late_tasks.length}
        >
          <div className="min-w-0">
            <p className="truncate font-semibold">{bucket.label}</p>
            {bucket.sublabel ? <p className="truncate text-xs text-muted-foreground">{bucket.sublabel}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-lg font-bold tabular-nums">
              {bucket.score === null ? "–" : `${bucket.score}%`}
            </span>
            <GradeBadge score={bucket.score} />
          </div>
        </button>
        <StackedBar bucket={bucket} />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{facts.join(" · ")}</p>
          {bucket.late_tasks.length ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary"
            >
              Lihat yang telat
              <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
            </button>
          ) : null}
        </div>
        {open ? (
          <ul className="divide-y rounded-md border text-sm">
            {bucket.late_tasks.map((t) => (
              <li key={t.task_id}>
                <Link href={`/tasks/${t.task_id}`} className="flex items-start justify-between gap-2 px-3 py-2 hover:bg-muted/50">
                  <span className="min-w-0">
                    <span className="block truncate">{t.task_title}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {formatDateId(t.deadline)} {formatTimeId(t.deadline)} WIB
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium",
                      t.kind === "overdue" ? "bg-red-50 text-red-800" : "bg-orange-50 text-orange-900",
                    )}
                  >
                    {t.kind === "overdue" ? "Belum lapor" : "Terlambat"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

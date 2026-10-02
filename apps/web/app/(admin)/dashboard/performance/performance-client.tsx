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
import { StatTile } from "@/components/stat-tile";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatDateId, formatTimeId } from "@/lib/format-datetime";
import { OUTLET_FILTER_OPTIONS } from "@/lib/outlet-codes";
import { gradeOf, type GroupBy, type PerfBucket, type ScoreGrade } from "@/lib/performance";
import { cn } from "@/lib/utils";

type PerformancePeriod = "7d" | "30d" | "month" | "last_month";
type Bucket = PerfBucket & {
  letters?: number;
  sop_required: number;
  sop_done: number;
  sop_score: number | null;
  final_score: number | null;
  sop_missed: { date: string; title: string }[];
};
type PerformanceData = {
  period: PerformancePeriod;
  range: { start: string; end: string };
  sop_until: string | null;
  group_by: GroupBy;
  overall: Bucket;
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
  { key: "overdue", label: "Belum lapor / SOP tidak diisi", color: "#d03b3b" },
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

      <div className="space-y-2">
        <Card className="gap-0 py-0">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {data ? `Deadline ${formatRange(data.range)}` : " "}
              </p>
              {overall ? <GradeBadge score={overall.final_score} /> : null}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <HeroScore label="Tugas tepat waktu" score={loading ? undefined : overall?.score} />
              <HeroScore
                label="SOP harian terisi"
                score={loading ? undefined : overall?.sop_score}
                hint={
                  overall && overall.sop_required
                    ? `${overall.sop_done}/${overall.sop_required} laporan`
                    : data && !data.sop_until
                      ? "Dihitung mulai besok"
                      : undefined
                }
              />
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-4 gap-2">
          <StatTile label="Total tugas" value={loading ? undefined : overall?.total ?? 0} />
          <StatTile label="Tepat waktu" value={loading ? undefined : overall?.on_time ?? 0} tone="green" />
          <StatTile label="Terlambat" value={loading ? undefined : overall?.late_done ?? 0} tone="amber" />
          <StatTile label="Belum lapor" value={loading ? undefined : overall?.overdue ?? 0} tone="red" />
        </div>
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

      <details className="rounded-xl border bg-card px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium">Cara menghitung skor</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Dihitung dari tugas yang <b>deadline-nya</b> jatuh di periode yang dipilih.</li>
          <li><b>Tepat waktu</b>: laporan masuk sebelum/pada deadline.</li>
          <li><b>Terlambat</b>: laporan masuk setelah deadline.</li>
          <li><b>Belum lapor</b>: deadline sudah lewat tapi belum ada laporan — dihitung terlambat.</li>
          <li>Tugas yang deadline-nya belum lewat tidak ikut dinilai.</li>
          <li>Skor = tepat waktu ÷ semua tugas yang sudah dinilai. Baik ≥ 90%, Cukup 75–89%, Perlu perhatian &lt; 75%.</li>
          <li><b>SOP harian</b>: laporan kegiatan wajib yang diisi staff lewat link personalnya, sesuai jabatan / jadwal posisi hari itu. Dihitung s.d. kemarin; laporan yang ditandai leader &quot;tidak valid&quot; / &quot;manipulasi&quot; tidak dihitung.</li>
          <li>Label Baik / Cukup / Perlu perhatian dan urutan memakai skor <b>terendah</b> dari Tugas dan SOP.</li>
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

function HeroScore({ label, score, hint }: { label: string; score?: number | null; hint?: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold leading-tight tabular-nums">
        {score === undefined || score === null ? "–" : `${score}%`}
      </p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
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

function MetricLine({ label, score, children }: { label: string; score: number | null; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
      <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums">
        {score === null ? "–" : `${score}%`}
      </span>
    </div>
  );
}

function SopBar({ required, done }: { required: number; done: number }) {
  if (!required) return <div className="h-2.5 rounded bg-muted" />;
  const missed = required - done;
  return (
    <div className="flex h-2.5 gap-0.5" role="img" aria-label={`SOP terisi ${done}, tidak diisi ${missed}`}>
      {done ? (
        <div title={`Terisi: ${done}`} className={cn("rounded-l", !missed && "rounded-r")} style={{ flexGrow: done, flexBasis: 0, backgroundColor: "#0ca30c", minWidth: 4 }} />
      ) : null}
      {missed ? (
        <div title={`Tidak diisi: ${missed}`} className={cn("rounded-r", !done && "rounded-l")} style={{ flexGrow: missed, flexBasis: 0, backgroundColor: "#d03b3b", minWidth: 4 }} />
      ) : null}
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
  const hasDetails = bucket.late_tasks.length > 0 || bucket.sop_missed.length > 0;
  const facts = [
    `${bucket.total} tugas`,
    `${bucket.on_time} tepat`,
    late ? `${late} telat` : null,
    bucket.overdue ? `${bucket.overdue} belum lapor` : null,
    bucket.revision ? `${bucket.revision} revisi` : null,
    showLetters && bucket.letters ? `${bucket.letters} teguran` : null,
  ].filter(Boolean);

  return (
    <Card className="gap-0 py-0">
      <CardContent className="space-y-2 p-3.5">
        <button
          type="button"
          className="flex w-full items-start justify-between gap-3 text-left"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          disabled={!hasDetails}
        >
          <div className="min-w-0">
            <p className="truncate font-semibold">{bucket.label}</p>
            {bucket.sublabel ? <p className="truncate text-xs text-muted-foreground">{bucket.sublabel}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <GradeBadge score={bucket.final_score} />
          </div>
        </button>
        <MetricLine label="Tugas" score={bucket.score}>
          <StackedBar bucket={bucket} />
        </MetricLine>
        <p className="text-xs text-muted-foreground">{bucket.total ? facts.join(" · ") : "Tidak ada tugas di periode ini"}</p>
        <MetricLine label="SOP" score={bucket.sop_score}>
          <SopBar required={bucket.sop_required} done={bucket.sop_done} />
        </MetricLine>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {bucket.sop_required
              ? `${bucket.sop_done}/${bucket.sop_required} laporan SOP terisi`
              : "Tidak ada SOP wajib"}
          </p>
          {hasDetails ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary"
            >
              Lihat rincian
              <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
            </button>
          ) : null}
        </div>
        {open ? (
          <div className="space-y-2">
          {bucket.late_tasks.length ? (
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
          {bucket.sop_missed.length ? (
            <ul className="divide-y rounded-md border text-sm">
              {bucket.sop_missed.map((m, i) => (
                <li key={`${m.date}-${i}`} className="flex items-start justify-between gap-2 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate">{m.title}</span>
                    <span className="text-xs text-muted-foreground">{formatDateId(`${m.date}T12:00:00+07:00`)}</span>
                  </span>
                  <span className="shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-800">
                    SOP tidak diisi
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

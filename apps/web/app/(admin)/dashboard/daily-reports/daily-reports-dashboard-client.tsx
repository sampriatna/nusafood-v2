"use client";

import { useCallback, useEffect, useState } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Filter,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  UserX,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateStaffReport } from "@/lib/api/daily-report-client";
import {
  type DailyActivityApiResponse,
  type DailyReportDashboardData,
  type DailyReportDashboardRow,
  type DailyReportRowLabel,
  type ReportConditionStatus,
  type StaffReportValidationStatus,
} from "@/lib/daily-activity-types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function todayLocal(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatTime(iso?: string | null): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function conditionLabel(condition?: ReportConditionStatus | null): string {
  switch (condition) {
    case "aman":
      return "Aman";
    case "kendala_ringan":
      return "Kendala ringan";
    case "follow_up_leader":
      return "Follow up leader";
    case "perlu_belanja":
      return "Perlu belanja/perbaikan";
    default:
      return "-";
  }
}

function labelMeta(label: DailyReportRowLabel): {
  text: string;
  className: string;
} {
  switch (label) {
    case "selesai_lengkap":
      return {
        text: "Selesai lengkap",
        className: "border-emerald-200 bg-emerald-100 text-emerald-800",
      };
    case "selesai_kendala":
      return {
        text: "Selesai ada kendala",
        className: "border-amber-200 bg-amber-100 text-amber-900",
      };
    case "belum_submit":
      return {
        text: "Belum submit",
        className: "border-red-200 bg-red-100 text-red-800",
      };
    case "tidak_wajib":
      return {
        text: "Tidak wajib",
        className: "border-slate-200 bg-slate-100 text-slate-600",
      };
    case "perlu_perbaikan":
      return {
        text: "Perlu perbaikan (leader)",
        className: "border-orange-200 bg-orange-100 text-orange-900",
      };
  }
}

export function DailyReportsDashboardClient() {
  const { toast } = useToast();
  const [data, setData] = useState<DailyReportDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [date, setDate] = useState(todayLocal());
  const [outlet, setOutlet] = useState("");

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const search = new URLSearchParams();
        if (date) search.set("date", date);
        if (outlet.trim()) search.set("outlet", outlet.trim());

        const res = await fetch(
          `/api/staff-reports/dashboard?${search.toString()}`,
          { credentials: "include" },
        );
        const json =
          (await res.json()) as DailyActivityApiResponse<DailyReportDashboardData>;

        if (!json.success || !json.data) {
          toast({
            title: "Gagal memuat dashboard",
            description: json.error || "Coba lagi",
            variant: "destructive",
          });
          return;
        }

        setData(json.data);
      } catch {
        toast({
          title: "Gagal memuat dashboard",
          description: "Periksa koneksi lalu coba lagi.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [date, outlet, toast],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const summary = data?.summary;
  const rows = data?.rows ?? [];
  const missing = data?.missing_required ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Kinerja per staff x kegiatan</h2>
          <p className="text-sm text-muted-foreground">
            Dashboard terpisah dari Task. Setiap baris = 1 orang + 1 kegiatan
            hari itu.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters((value) => !value)}
          >
            <Filter className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => void load(true)}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-3 text-sm text-blue-900">
          <strong>Terpisah dari Task.</strong> Ini audit Daily Activity SOP per
          person - siapa sudah/belum isi kegiatan standar hari ini.
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded border bg-emerald-100 px-2 py-1 text-emerald-800">
          Hijau: selesai lengkap
        </span>
        <span className="rounded border bg-amber-100 px-2 py-1 text-amber-900">
          Kuning: ada kendala
        </span>
        <span className="rounded border bg-orange-100 px-2 py-1 text-orange-900">
          Oranye: perlu perbaikan leader
        </span>
        <span className="rounded border bg-red-100 px-2 py-1 text-red-800">
          Merah: belum submit
        </span>
        <span className="rounded border bg-slate-100 px-2 py-1 text-slate-600">
          Abu: tidak wajib
        </span>
      </div>

      <Card className="border-slate-300 bg-slate-50">
        <CardContent className="flex flex-col justify-between gap-2 p-3 text-sm sm:flex-row sm:items-center">
          <p className="text-slate-700">
            Submit staff belum tentu benar. Validasi lapangan juga tersedia di{" "}
            <strong>Leader Monitoring</strong>.
          </p>
          <Link href="/dashboard/leader-monitoring">
            <Button size="sm" variant="outline">
              Buka Leader Monitoring
            </Button>
          </Link>
        </CardContent>
      </Card>

      {showFilters ? (
        <Card>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tanggal</Label>
              <Input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Outlet</Label>
              <Input
                value={outlet}
                onChange={(event) => setOutlet(event.target.value)}
                placeholder="Kosongkan untuk semua outlet"
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <SummaryCard
          icon={ClipboardList}
          label="Total submit hari ini"
          value={summary?.total_today}
          loading={isLoading}
          className="border-slate-200 bg-slate-50"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Selesai lengkap"
          value={summary?.complete_ok}
          loading={isLoading}
          className="border-emerald-200 bg-emerald-50 text-emerald-800"
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Selesai ada kendala"
          value={summary?.complete_with_issue}
          loading={isLoading}
          className="border-amber-200 bg-amber-50 text-amber-800"
        />
        <SummaryCard
          icon={UserX}
          label="Belum submit wajib"
          value={summary?.not_submitted}
          loading={isLoading}
          className="border-red-200 bg-red-50 text-red-800"
        />
        <SummaryCard
          icon={Users}
          label="Staff lengkap semua wajib"
          value={summary?.staff_submitted}
          loading={isLoading}
        />
        <SummaryCard
          icon={UserX}
          label="Staff belum lengkap"
          value={summary?.staff_not_submitted}
          loading={isLoading}
        />
      </div>

      {!isLoading && missing.length > 0 ? (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center gap-2 font-semibold text-red-900">
              <AlertTriangle className="size-4" />
              Belum submit kegiatan wajib ({missing.length})
            </div>
            <ul className="space-y-1 text-sm text-red-900">
              {missing.slice(0, 10).map((item) => (
                <li key={`${item.staff_id}-${item.report_template_id}`}>
                  <span className="font-medium">{item.staff_name}</span> -{" "}
                  {item.report_title} - {item.outlet}
                </li>
              ))}
              {missing.length > 10 ? (
                <li className="text-red-700">
                  +{missing.length - 10} lainnya
                </li>
              ) : null}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Link href="/settings/daily-activity">
          <Button variant="outline" size="sm">
            Super Admin Hub
            <ExternalLink className="ml-1 size-3.5" />
          </Button>
        </Link>
        <Link href="/settings/report-links">
          <Button variant="outline" size="sm">
            Kelola Link Staff
            <ExternalLink className="ml-1 size-3.5" />
          </Button>
        </Link>
        <Link href="/settings/report-templates">
          <Button variant="outline" size="sm">
            Edit Template
            <ExternalLink className="ml-1 size-3.5" />
          </Button>
        </Link>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          {rows.length} baris
        </h3>

        {isLoading ? (
          <Card>
            <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Memuat dashboard...
            </CardContent>
          </Card>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Tidak ada data untuk filter ini
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-lg border md:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3 font-medium">Staff</th>
                    <th className="p-3 font-medium">Outlet</th>
                    <th className="p-3 font-medium">Kegiatan</th>
                    <th className="p-3 font-medium">Checklist</th>
                    <th className="p-3 font-medium">Jam</th>
                    <th className="p-3 font-medium">Kondisi</th>
                    <th className="p-3 font-medium">Foto</th>
                    <th className="p-3 font-medium">Catatan</th>
                    <th className="p-3 font-medium">Label</th>
                    <th className="p-3 font-medium">Validasi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <RowDesktop
                      key={`${row.staff_id}-${row.report_template_id}`}
                      row={row}
                      onValidated={() => void load(true)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {rows.map((row) => (
                <RowMobile
                  key={`${row.staff_id}-${row.report_template_id}`}
                  row={row}
                  onValidated={() => void load(true)}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  loading,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value?: number;
  loading: boolean;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="p-3">
        <div className="mb-1 flex items-center gap-2 text-xs">
          <Icon className="size-4" />
          {label}
        </div>
        <p className="text-2xl font-bold">{loading ? "-" : value ?? 0}</p>
      </CardContent>
    </Card>
  );
}

function RowDesktop({
  row,
  onValidated,
}: {
  row: DailyReportDashboardRow;
  onValidated?: () => void;
}) {
  const meta = labelMeta(row.label);

  return (
    <tr
      className={cn(
        "border-t",
        row.label === "belum_submit" && "bg-red-50/40",
        row.label === "selesai_kendala" && "bg-amber-50/40",
        row.label === "selesai_lengkap" && "bg-emerald-50/30",
        row.label === "perlu_perbaikan" && "bg-orange-50/50",
      )}
    >
      <td className="p-3 font-medium">{row.staff_name}</td>
      <td className="p-3">{row.outlet}</td>
      <td className="p-3">
        {row.report_title}
        {row.is_required_daily ? (
          <Badge variant="secondary" className="ml-1 text-[10px]">
            Wajib
          </Badge>
        ) : null}
      </td>
      <td className="whitespace-nowrap p-3">
        {row.submitted
          ? `${row.checklist_checked}/${row.checklist_total} (${row.checklist_percent}%)`
          : "-"}
      </td>
      <td className="whitespace-nowrap p-3">{formatTime(row.submitted_at)}</td>
      <td className="p-3">{conditionLabel(row.status_condition)}</td>
      <td className="p-3">
        {row.photo_url ? (
          <a href={row.photo_url} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={row.photo_url}
              alt="Foto"
              className="size-10 rounded object-cover"
            />
          </a>
        ) : (
          "-"
        )}
      </td>
      <td className="max-w-[180px] truncate p-3" title={row.note || ""}>
        {row.note || "-"}
      </td>
      <td className="p-3">
        <span
          className={cn("rounded border px-2 py-1 text-xs font-medium", meta.className)}
        >
          {meta.text}
        </span>
      </td>
      <td className="min-w-[160px] p-3">
        {row.submission?.leader_validation ? (
          <p className="mb-2 text-xs">
            <span className="font-semibold uppercase">
              {row.submission.leader_validation}
            </span>
            {row.submission.leader_validation_note
              ? ` — ${row.submission.leader_validation_note}`
              : ""}
          </p>
        ) : null}
        {row.submitted && row.submission?.id ? (
          <ValidateStaffButtons
            submissionId={row.submission.id}
            onDone={onValidated}
          />
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </td>
    </tr>
  );
}

function RowMobile({
  row,
  onValidated,
}: {
  row: DailyReportDashboardRow;
  onValidated?: () => void;
}) {
  const meta = labelMeta(row.label);

  return (
    <Card
      className={cn(
        row.label === "belum_submit" && "border-red-200 bg-red-50/40",
        row.label === "selesai_kendala" && "border-amber-200 bg-amber-50/40",
        row.label === "selesai_lengkap" &&
          "border-emerald-200 bg-emerald-50/30",
        row.label === "perlu_perbaikan" && "border-orange-300 bg-orange-50/50",
      )}
    >
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{row.staff_name}</p>
            <p className="text-sm text-muted-foreground">
              {row.outlet} · {row.position}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded border px-2 py-1 text-xs font-medium",
              meta.className,
            )}
          >
            {meta.text}
          </span>
        </div>
        <p className="text-sm">
          <span className="text-muted-foreground">Kegiatan: </span>
          {row.report_title}
        </p>
        <p className="text-sm">
          <span className="text-muted-foreground">Checklist: </span>
          {row.submitted
            ? `${row.checklist_checked}/${row.checklist_total} (${row.checklist_percent}%)`
            : "-"}
        </p>
        <p className="text-sm">
          <span className="text-muted-foreground">Jam: </span>
          {formatTime(row.submitted_at)}
          {" · "}
          <span className="text-muted-foreground">Kondisi: </span>
          {conditionLabel(row.status_condition)}
        </p>
        {row.submission?.leader_validation ? (
          <p className="text-sm">
            <span className="text-muted-foreground">Validasi leader: </span>
            <span className="font-semibold uppercase">
              {row.submission.leader_validation}
            </span>
            {row.submission.leader_validation_note
              ? ` — ${row.submission.leader_validation_note}`
              : ""}
          </p>
        ) : null}
        {row.note ? (
          <p className="text-sm">
            <span className="text-muted-foreground">Catatan: </span>
            {row.note}
          </p>
        ) : null}
        {row.photo_url ? (
          <a
            href={row.photo_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary"
          >
            <ImageIcon className="size-4" />
            Lihat foto
          </a>
        ) : null}
        {row.submitted && row.submission?.id ? (
          <ValidateStaffButtons
            submissionId={row.submission.id}
            onDone={onValidated}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function ValidateStaffButtons({
  submissionId,
  onDone,
}: {
  submissionId: string;
  onDone?: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  const run = async (validation: StaffReportValidationStatus) => {
    if (validation !== "valid" && !note.trim()) {
      toast({
        title: "Catatan wajib",
        description: "Isi catatan singkat dulu (wajib untuk revisi / tidak valid).",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      const res = await validateStaffReport({
        submission_id: submissionId,
        validation,
        note,
      });
      if (res.success) {
        toast({ title: "Validasi tersimpan", description: validation });
        setOpen(false);
        setNote("");
        onDone?.();
      } else {
        toast({
          title: "Gagal",
          description: res.error || "Tidak bisa menyimpan validasi",
          variant: "destructive",
        });
      }
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 w-full"
        onClick={() => setOpen(true)}
      >
        Validasi lapangan
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border bg-white p-3">
      <p className="text-xs font-semibold text-slate-700">
        Cek fisik dulu. Pilih hasil:
      </p>
      <Input
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Catatan leader (wajib jika revisi)"
        className="h-10 text-sm"
      />
      <div className="grid grid-cols-2 gap-1.5">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => void run("valid")}
        >
          Valid
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => void run("revisi")}
        >
          Revisi
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={busy}
          onClick={() => void run("tidak_valid")}
        >
          Tidak valid
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={busy}
          onClick={() => void run("manipulasi")}
        >
          Manipulasi
        </Button>
      </div>
      <button
        type="button"
        className="w-full text-xs text-muted-foreground underline"
        onClick={() => setOpen(false)}
      >
        Batal
      </button>
    </div>
  );
}

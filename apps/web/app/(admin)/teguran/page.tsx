"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  Bell,
  Clock,
  FileWarning,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import type {
  DisciplinaryDashboardData,
  DisciplinaryLetter,
  DisciplinaryLetterStatus,
  DisciplinaryLetterType,
} from "@nusafood/types";
import { AdminPage } from "@/components/admin-page";
import { StatTile } from "@/components/stat-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { OUTLET_FILTER_OPTIONS } from "@/lib/outlet-codes";
import { formatTanggal, outletLabel, presentViolation, romanLevel } from "@/lib/letter/letter-format";

type ApiResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

const STATUS_TONE: Record<DisciplinaryLetterStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  WAITING_APPROVAL: "bg-amber-100 text-amber-900",
  APPROVED: "bg-sky-100 text-sky-800",
  SENT: "bg-sky-100 text-sky-800",
  ACKNOWLEDGED: "bg-violet-100 text-violet-800",
  RESOLVED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-slate-100 text-slate-500",
};

function statusLabel(status: DisciplinaryLetterStatus): string {
  const map: Record<DisciplinaryLetterStatus, string> = {
    DRAFT: "Draft",
    WAITING_APPROVAL: "Menunggu approval",
    APPROVED: "Disetujui",
    SENT: "Terkirim",
    ACKNOWLEDGED: "Sudah dibaca",
    RESOLVED: "Selesai",
    CANCELLED: "Dibatalkan",
  };
  return map[status];
}

export default function TeguranCenterPage() {
  const { toast } = useToast();
  const [data, setData] = useState<DisciplinaryDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [outlet, setOutlet] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState<DisciplinaryLetterType | "ALL">("ALL");
  const [status, setStatus] = useState<DisciplinaryLetterStatus | "ALL">("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (outlet.trim()) params.set("outlet", outlet.trim());
      if (employeeId.trim()) params.set("employee_id", employeeId.trim());
      if (type !== "ALL") params.set("type", type);
      if (status !== "ALL") params.set("status", status);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      const res = await fetch(`/api/disciplinary?${params.toString()}`, {
        credentials: "include",
      });
      const json = (await res.json()) as ApiResponse<DisciplinaryDashboardData>;
      if (!json.success || !json.data) {
        toast({
          title: "Gagal memuat Teguran",
          description: json.error || "Coba lagi",
          variant: "destructive",
        });
        return;
      }
      setData(json.data);
    } catch {
      toast({
        title: "Gagal memuat Teguran",
        description: "Periksa koneksi lalu coba lagi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [outlet, employeeId, type, status, dateFrom, dateTo, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const letters = data?.letters ?? [];
  const summary = data?.summary;

  const cards = useMemo(
    () => [
      {
        label: "Total bulan ini",
        value: summary?.total_this_month,
        icon: Bell,
        tone: "neutral" as const,
      },
      {
        label: "ST aktif",
        value: summary?.st_active,
        icon: FileWarning,
        tone: "amber" as const,
      },
      {
        label: "SP aktif",
        value: summary?.sp_active,
        icon: AlertTriangle,
        tone: "red" as const,
      },
      {
        label: "Menunggu approval",
        value: summary?.waiting_approval,
        icon: Clock,
        tone: "sky" as const,
      },
      {
        label: "Karyawan berulang",
        value: summary?.repeat_employees,
        icon: Users,
        tone: "neutral" as const,
      },
    ],
    [summary],
  );

  return (
    <AdminPage
      title="Teguran"
      description="Surat disiplin operasional: ST untuk pembinaan, SP untuk sanksi formal HR."
      maxWidth="3xl"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          {loading ? "Memuat…" : `${letters.length} surat`}
        </h2>
        <div className="flex gap-2">
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="icon"
            aria-label="Filter"
            onClick={() => setShowFilters((v) => !v)}
          >
            <Filter className="size-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Muat ulang" onClick={() => void load()}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button asChild>
            <Link href="/teguran/new">
              <Plus className="mr-1 size-4" />
              Buat
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {cards.map((c) => (
          <StatTile
            key={c.label}
            icon={c.icon}
            label={c.label}
            value={loading ? undefined : c.value ?? 0}
            tone={c.value ? c.tone : "neutral"}
          />
        ))}
      </div>

      {showFilters ? (
        <Card className="gap-0 py-0">
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Outlet</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={outlet}
                onChange={(e) => setOutlet(e.target.value)}
              >
                <option value="">Semua outlet</option>
                {OUTLET_FILTER_OPTIONS.filter((o) => o.value !== "ALL").map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>ID karyawan</Label>
              <Input
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Jenis</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={type}
                onChange={(e) =>
                  setType(e.target.value as DisciplinaryLetterType | "ALL")
                }
              >
                <option value="ALL">Semua</option>
                <option value="TEGURAN">Surat Teguran</option>
                <option value="PERINGATAN">Surat Peringatan</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as DisciplinaryLetterStatus | "ALL")
                }
              >
                <option value="ALL">Semua</option>
                <option value="DRAFT">Draft</option>
                <option value="WAITING_APPROVAL">Menunggu Approval</option>
                <option value="APPROVED">Disetujui</option>
                <option value="SENT">Terkirim</option>
                <option value="ACKNOWLEDGED">Sudah dibaca</option>
                <option value="RESOLVED">Selesai</option>
                <option value="CANCELLED">Dibatalkan</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Dari tanggal</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sampai tanggal</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-2">
        {loading ? (
          <Card className="gap-0 py-0">
            <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Memuat...
            </CardContent>
          </Card>
        ) : letters.length === 0 ? (
          <Card className="gap-0 py-0">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Belum ada surat. Tekan “Buat” untuk membuat surat dari tugas yang terlambat.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {letters.map((letter) => (
              <LetterCard key={letter.id} letter={letter} />
            ))}
          </div>
        )}
      </section>
    </AdminPage>
  );
}

function LetterCard({ letter }: { letter: DisciplinaryLetter }) {
  const docLabel = `${letter.type === "TEGURAN" ? "Surat Teguran" : "Surat Peringatan"} ${romanLevel(letter.level)}`;
  return (
    <Link href={`/teguran/${letter.id}`} className="block">
      <Card className="gap-0 py-0 transition-colors hover:border-primary/40">
        <CardContent className="space-y-1.5 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {docLabel}
              </p>
              <p className="truncate font-semibold">{letter.employee_name_snapshot}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[letter.status]}`}
            >
              {statusLabel(letter.status)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {outletLabel(letter.outlet_name_snapshot)} · {formatTanggal(letter.incident_date)}
          </p>
          <p className="line-clamp-2 text-sm">{presentViolation(letter.violation_detail)}</p>
          <p className="flex items-center justify-between pt-1 font-mono text-xs text-muted-foreground">
            {letter.letter_number}
            <ChevronRight className="size-4" />
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

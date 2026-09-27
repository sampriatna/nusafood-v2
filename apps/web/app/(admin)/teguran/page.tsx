"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  Bell,
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
import { Badge } from "@/components/ui/badge";
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
      },
      {
        label: "ST aktif",
        value: summary?.st_active,
        icon: FileWarning,
      },
      {
        label: "SP aktif",
        value: summary?.sp_active,
        icon: AlertTriangle,
      },
      {
        label: "Menunggu approval",
        value: summary?.waiting_approval,
        icon: Loader2,
      },
      {
        label: "Karyawan berulang",
        value: summary?.repeat_employees,
        icon: Users,
      },
    ],
    [summary],
  );

  return (
    <AdminPage title="Teguran" maxWidth="3xl">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Disiplin operasional</h2>
          <p className="text-sm text-muted-foreground">
            ST untuk pembinaan, SP untuk sanksi formal HR.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters((v) => !v)}
          >
            <Filter className="size-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => void load()}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Link href="/teguran/new">
            <Button size="sm">
              <Plus className="mr-1 size-4" />
              Buat
            </Button>
          </Link>
        </div>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {cards.map((c) => (
          <div
            key={c.label}
            className="flex shrink-0 items-center gap-2 rounded-lg border bg-card px-3 py-2"
          >
            <c.icon className="size-4 text-muted-foreground" />
            <span className="text-lg font-bold leading-none">{loading ? "-" : c.value ?? 0}</span>
            <span className="text-xs text-muted-foreground">{c.label}</span>
          </div>
        ))}
      </div>

      {showFilters ? (
        <Card>
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
        <h3 className="text-sm font-medium text-muted-foreground">
          {letters.length} surat
        </h3>
        {loading ? (
          <Card>
            <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Memuat...
            </CardContent>
          </Card>
        ) : letters.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
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
      <Card className="transition-colors hover:bg-muted/40">
        <CardContent className="space-y-1.5 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {docLabel}
              </p>
              <p className="truncate font-semibold">{letter.employee_name_snapshot}</p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {statusLabel(letter.status)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
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

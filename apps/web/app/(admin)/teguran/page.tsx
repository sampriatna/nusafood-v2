"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
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

type ApiResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

function statusLabel(status: DisciplinaryLetterStatus): string {
  const map: Record<DisciplinaryLetterStatus, string> = {
    DRAFT: "Draft",
    WAITING_APPROVAL: "Menunggu Approval",
    APPROVED: "Disetujui",
    SENT: "Terkirim",
    ACKNOWLEDGED: "Diakui",
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
          title: "Gagal memuat Teguran Center",
          description: json.error || "Coba lagi",
          variant: "destructive",
        });
        return;
      }
      setData(json.data);
    } catch {
      toast({
        title: "Gagal memuat Teguran Center",
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
    <AdminPage title="Teguran Center" maxWidth="3xl">
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-3">
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <c.icon className="size-3.5" />
                {c.label}
              </div>
              <p className="text-2xl font-bold">{loading ? "-" : c.value ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {showFilters ? (
        <Card>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Outlet</Label>
              <Input
                value={outlet}
                onChange={(e) => setOutlet(e.target.value)}
                placeholder="Kode outlet"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Karyawan (staff id)</Label>
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
                <option value="ACKNOWLEDGED">Diakui</option>
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
              Belum ada surat. Buat dari task terlambat atau form manual.
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
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-mono text-xs text-muted-foreground">
              {letter.letter_number}
            </p>
            <p className="font-semibold">{letter.employee_name_snapshot}</p>
            <p className="text-sm text-muted-foreground">
              {letter.outlet_name_snapshot} · {letter.incident_date}
            </p>
          </div>
          <Badge variant="secondary">{statusLabel(letter.status)}</Badge>
        </div>
        <p className="text-sm">
          <span className="text-muted-foreground">
            {letter.type === "TEGURAN" ? "ST" : "SP"} {letter.level}
          </span>
          {" · "}
          {letter.title}
        </p>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {letter.violation_detail}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href={`/teguran/${letter.id}`}>
            <Button size="sm" variant="outline">
              Detail
            </Button>
          </Link>
          {letter.status === "DRAFT" || letter.status === "WAITING_APPROVAL" ? (
            <Link href={`/teguran/new?edit=${letter.id}`}>
              <Button size="sm" variant="secondary">
                Edit Draft
              </Button>
            </Link>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

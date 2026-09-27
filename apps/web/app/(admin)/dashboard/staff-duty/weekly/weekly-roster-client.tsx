"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, Copy, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  WORK_SHIFT_CODES,
  WORK_SHIFT_DEFINITIONS,
  type WorkShiftCode,
} from "@/lib/daily-activity-sop";
import { addDaysToDateKey, formatDateId, todayKeyInAppTz } from "@/lib/format-datetime";
import type {
  RosterCells,
  ShiftCells,
  WeeklyRoster,
} from "@/lib/services/weekly-roster.service";

type Props = {
  outlets: { code: string; name: string }[];
  /** Leader: outlet sendiri, tidak bisa diganti */
  lockedOutlet: string;
};

const DAY_NAMES = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

async function fetchRoster(outlet: string, week: string) {
  const params = new URLSearchParams({ week });
  if (outlet) params.set("outlet", outlet);
  const res = await fetch(`/api/staff-duty/weekly?${params}`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  const json = (await res.json()) as { success: boolean; data?: WeeklyRoster; error?: string };
  if (!json.success || !json.data) throw new Error(json.error || "Gagal memuat jadwal");
  return json.data;
}

export function WeeklyRosterClient({ outlets, lockedOutlet }: Props) {
  const { toast } = useToast();
  const [outlet, setOutlet] = useState(lockedOutlet || outlets[0]?.code || "");
  const [week, setWeek] = useState(todayKeyInAppTz());
  const [roster, setRoster] = useState<WeeklyRoster | null>(null);
  const [cells, setCells] = useState<RosterCells>({});
  const [shiftCells, setShiftCells] = useState<ShiftCells>({});
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRoster(lockedOutlet ? "" : outlet, week);
      setRoster(data);
      setCells(data.cells);
      setShiftCells(data.shift_cells ?? {});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal memuat jadwal");
    } finally {
      setLoading(false);
    }
  }, [outlet, week, lockedOutlet]);

  useEffect(() => {
    void load();
  }, [load]);

  function setCell(date: string, position: string, staffId: string) {
    setCells((prev) => {
      const day = { ...(prev[date] ?? {}) };
      if (staffId) day[position] = staffId;
      else delete day[position];
      return { ...prev, [date]: day };
    });
  }

  function setShift(date: string, staffId: string, shift: string) {
    setShiftCells((prev) => {
      const day = { ...(prev[date] ?? {}) };
      if (WORK_SHIFT_CODES.includes(shift as WorkShiftCode)) {
        day[staffId] = shift as WorkShiftCode;
      } else {
        delete day[staffId];
      }
      return { ...prev, [date]: day };
    });
  }

  async function copyLastWeek() {
    if (!roster) return;
    try {
      const prev = await fetchRoster(lockedOutlet ? "" : outlet, addDaysToDateKey(roster.week_start, -7));
      const next: RosterCells = {};
      const nextShifts: ShiftCells = {};
      roster.dates.forEach((date, i) => {
        next[date] = { ...(prev.cells[prev.dates[i]] ?? {}) };
        nextShifts[date] = { ...(prev.shift_cells?.[prev.dates[i]] ?? {}) };
      });
      setCells(next);
      setShiftCells(nextShifts);
      toast({ title: "Jadwal minggu lalu disalin", description: "Posisi dan shift ikut disalin. Cek lalu tekan Simpan." });
    } catch (cause) {
      toast({
        title: "Gagal menyalin",
        description: cause instanceof Error ? cause.message : "Coba lagi",
        variant: "destructive",
      });
    }
  }

  async function save() {
    if (!roster || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/staff-duty/weekly", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          outlet: lockedOutlet ? undefined : outlet,
          week_start: roster.week_start,
          cells,
          shift_cells: shiftCells,
        }),
      });
      const json = (await res.json()) as { success: boolean; data?: WeeklyRoster; error?: string };
      if (!json.success || !json.data) throw new Error(json.error || "Gagal menyimpan");
      setRoster(json.data);
      setCells(json.data.cells);
      setShiftCells(json.data.shift_cells ?? {});
      toast({ title: "Jadwal minggu ini disimpan", description: "Shift Waiter sekarang menjadi acuan SOP harian." });
    } catch (cause) {
      toast({
        title: "Gagal menyimpan jadwal",
        description: cause instanceof Error ? cause.message : "Coba lagi",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  const hasTemplatePositions = roster?.positions.some((p) => p.used_by_templates) ?? false;
  const visiblePositions =
    roster?.positions.filter((p) => showAll || !hasTemplatePositions || p.used_by_templates) ?? [];
  const waiterStaff = roster?.positions.find((p) => p.position === "Waiters")?.staff ?? [];

  return (
    <div className="space-y-4">
      <Card className="gap-0 border-primary/20 bg-primary/5 py-0">
        <CardContent className="space-y-1 p-3 text-sm">
          <p className="font-semibold">Isi sekali seminggu</p>
          <p className="text-muted-foreground">
            Atur PIC posisi dan shift Waiter. Shift 1K/2K/3K menentukan SOP harian
            yang wajib dikerjakan, jadi staff tidak memilih kewajibannya sendiri.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {!lockedOutlet && outlets.length ? (
          <select
            className="rounded-md border bg-background px-2 py-2 text-base"
            value={outlet}
            onChange={(e) => setOutlet(e.target.value)}
          >
            {outlets.map((o) => (
              <option key={o.code} value={o.code}>
                {o.name}
              </option>
            ))}
          </select>
        ) : null}
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" onClick={() => setWeek(addDaysToDateKey(roster?.week_start ?? week, -7))} aria-label="Minggu sebelumnya">
            <ChevronLeft className="size-4" />
          </Button>
          <span className="px-1 text-sm font-medium">
            {roster ? `${formatDateId(roster.dates[0])} – ${formatDateId(roster.dates[6])}` : "…"}
          </span>
          <Button size="icon" variant="outline" onClick={() => setWeek(addDaysToDateKey(roster?.week_start ?? week, 7))} aria-label="Minggu berikutnya">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Coba lagi
          </Button>
        </div>
      ) : null}

      {loading && !roster ? <p className="text-sm text-muted-foreground">Memuat…</p> : null}

      {roster && !visiblePositions.length && !waiterStaff.length ? (
        <p className="text-sm text-muted-foreground">
          Belum ada staff aktif dengan jabatan standar di outlet ini.
        </p>
      ) : null}

      {roster && (visiblePositions.length || waiterStaff.length) ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void copyLastWeek()}>
              <Copy className="mr-1.5 size-4" />
              Salin minggu lalu
            </Button>
            {hasTemplatePositions ? (
              <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
                {showAll ? "Hanya posisi PIC tugas" : "Tampilkan semua posisi"}
              </Button>
            ) : null}
          </div>

          {roster.dates.map((date, i) => (
            <Card key={date} className="gap-0 py-0">
              <CardContent className="space-y-3 p-3">
                <p className="text-sm font-semibold">
                  {DAY_NAMES[i]}, {formatDateId(date)}
                </p>

                {waiterStaff.length ? (
                  <div className="space-y-2 rounded-xl border border-primary/15 bg-primary/5 p-3">
                    <div className="flex items-center gap-2">
                      <Clock3 className="size-4 text-primary" />
                      <div>
                        <p className="text-sm font-semibold">Shift Waiter</p>
                        <p className="text-xs text-muted-foreground">
                          Kosongkan bila tidak bertugas / belum ditetapkan.
                        </p>
                      </div>
                    </div>
                    {waiterStaff.map((s) => (
                      <label key={s.staff_id} className="flex items-center gap-2 text-sm">
                        <span className="min-w-0 flex-1 truncate">{s.name}</span>
                        <select
                          className="w-40 rounded-md border bg-background px-2 py-1.5 text-base"
                          value={shiftCells[date]?.[s.staff_id] ?? ""}
                          onChange={(e) => setShift(date, s.staff_id, e.target.value)}
                        >
                          <option value="">Belum ditetapkan</option>
                          {WORK_SHIFT_CODES.map((code) => (
                            <option key={code} value={code}>
                              {code} · {WORK_SHIFT_DEFINITIONS[code].start}–{WORK_SHIFT_DEFINITIONS[code].end}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                ) : null}

                {visiblePositions.map((p) => (
                  <label key={p.position} className="flex items-center gap-2 text-sm">
                    <span className="w-28 shrink-0 text-muted-foreground">{p.label}</span>
                    <select
                      className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1.5 text-base"
                      value={cells[date]?.[p.position] ?? ""}
                      onChange={(e) => setCell(date, p.position, e.target.value)}
                    >
                      <option value="">Sesuai jabatan utama</option>
                      {p.staff.map((s) => (
                        <option key={s.staff_id} value={s.staff_id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </CardContent>
            </Card>
          ))}

          <div className="sticky bottom-3">
            <Button className="w-full" onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
              Simpan jadwal minggu ini
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

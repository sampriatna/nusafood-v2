"use client";

import { useMemo, useState, useTransition } from "react";
import type { Staff } from "@nusafood/types";
import { Loader2, RotateCcw, Save, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  POSITION_GROUP_LABELS,
  REPORT_POSITION_GROUPS,
  getPositionGroupLabel,
  resolveStaffPositionGroup,
} from "@/lib/position-groups";
import { cn } from "@/lib/utils";
import { outletShortName } from "@/lib/outlet-codes";

type JobSetting = {
  staff_id: string;
  secondary_positions: string[];
  active_positions: string[];
  active_date: string | null;
};

type Props = {
  staff: Staff[];
  settings: JobSetting[];
  today: string;
  canEditProfile: boolean;
  canSetDuty: boolean;
};

type Draft = {
  secondary: string[];
  active: string[];
};

function primaryOf(member: Staff): string {
  return resolveStaffPositionGroup(member.position ?? "") || member.position || "";
}

export function StaffDutyClient({
  staff,
  settings,
  today,
  canEditProfile,
  canSetDuty,
}: Props) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const settingMap = useMemo(
    () => new Map(settings.map((setting) => [setting.staff_id, setting])),
    [settings],
  );

  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const initial: Record<string, Draft> = {};
    for (const member of staff) {
      const primary = primaryOf(member);
      const setting = settingMap.get(member.staff_id);
      const secondary = (setting?.secondary_positions ?? []).filter(
        (position) => position !== primary,
      );
      const active =
        setting?.active_date === today && setting.active_positions.length
          ? setting.active_positions
          : primary
            ? [primary]
            : [];
      initial[member.staff_id] = { secondary, active };
    }
    return initial;
  });

  function patchDraft(staffId: string, updater: (draft: Draft) => Draft) {
    setDrafts((prev) => ({
      ...prev,
      [staffId]: updater(prev[staffId] ?? { secondary: [], active: [] }),
    }));
  }

  function toggleSecondary(member: Staff, position: string) {
    const primary = primaryOf(member);
    if (position === primary) return;

    patchDraft(member.staff_id, (draft) => {
      const exists = draft.secondary.includes(position);
      const secondary = exists
        ? draft.secondary.filter((item) => item !== position)
        : [...draft.secondary, position];
      let active = draft.active.filter(
        (item) => item === primary || secondary.includes(item),
      );
      if (!active.length && primary) active = [primary];
      return { secondary, active };
    });
  }

  function toggleActive(member: Staff, position: string) {
    patchDraft(member.staff_id, (draft) => {
      const exists = draft.active.includes(position);
      if (exists && draft.active.length === 1) return draft;
      return {
        ...draft,
        active: exists
          ? draft.active.filter((item) => item !== position)
          : [...draft.active, position],
      };
    });
  }

  function resetToPrimary(member: Staff) {
    const primary = primaryOf(member);
    patchDraft(member.staff_id, (draft) => ({
      ...draft,
      active: primary ? [primary] : [],
    }));
  }

  function saveProfile(member: Staff) {
    const draft = drafts[member.staff_id];
    if (!draft) return;
    startTransition(async () => {
      const res = await fetch(`/api/staff-jobs/${member.staff_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secondary_positions: draft.secondary }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: JobSetting;
      };
      if (!res.ok || json.success === false) {
        toast({
          title: "Gagal menyimpan kompetensi",
          description: json.error || "Coba lagi",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Jabatan tambahan disimpan",
        description: member.name,
      });
    });
  }

  function saveDuty(member: Staff) {
    const draft = drafts[member.staff_id];
    if (!draft?.active.length) return;
    startTransition(async () => {
      const res = await fetch(`/api/staff-jobs/${member.staff_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_positions: draft.active, date: today }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
      };
      if (!res.ok || json.success === false) {
        toast({
          title: "Gagal mengatur posisi hari ini",
          description: json.error || "Coba lagi",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Posisi hari ini aktif",
        description: `${member.name}: ${draft.active
          .map(getPositionGroupLabel)
          .join(" + ")}`,
      });
    });
  }

  const q = query.trim().toLowerCase();
  const visibleStaff = q
    ? staff.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.outlet ?? "").toLowerCase().includes(q) ||
          (m.position ?? "").toLowerCase().includes(q),
      )
    : staff;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {formatToday(today)} · Staff otomatis bertugas sesuai jabatan utamanya.
        Ubah hanya kalau hari ini ia pindah / membantu posisi lain.
      </p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama, outlet, atau jabatan…"
          className="pl-9 text-base"
        />
      </div>

      {visibleStaff.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Tidak ada staff yang cocok.
        </p>
      ) : null}

      {visibleStaff.map((member) => {
        const primary = primaryOf(member);
        const draft = drafts[member.staff_id] ?? {
          secondary: [],
          active: primary ? [primary] : [],
        };
        const allowedForToday = [
          primary,
          ...draft.secondary.filter((position) => position !== primary),
        ].filter(Boolean);

        return (
          <Card key={member.staff_id}>
            <CardContent className="space-y-3 p-4">
              <div className="min-w-0">
                <p className="font-bold">{member.name}</p>
                <p className="text-sm text-muted-foreground">
                  {outletShortName(member.outlet)} · Jabatan utama:{" "}
                  <span className="font-medium text-foreground">
                    {primary ? getPositionGroupLabel(primary) : "Belum diatur"}
                  </span>
                </p>
              </div>

              <details className="group rounded-lg border px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium">
                  Bisa bantu posisi lain
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    ({draft.secondary.length ? draft.secondary.map(getPositionGroupLabel).join(", ") : "belum ada"})
                  </span>
                </summary>
              <section className="space-y-2 pt-3">
                <p className="text-xs text-muted-foreground">
                  Pilih posisi yang bisa ia bantu. Ini hanya daftar kemampuan — tidak mengubah tugas hari ini.
                </p>
                {canEditProfile ? (
                  <div className="flex flex-wrap gap-2">
                    {REPORT_POSITION_GROUPS.filter(
                      (position) => position !== primary,
                    ).map((position) => {
                      const selected = draft.secondary.includes(position);
                      return (
                        <button
                          key={position}
                          type="button"
                          disabled={pending}
                          onClick={() => toggleSecondary(member, position)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "bg-background text-muted-foreground",
                          )}
                        >
                          {POSITION_GROUP_LABELS[position]}
                        </button>
                      );
                    })}
                  </div>
                ) : draft.secondary.length ? (
                  <div className="flex flex-wrap gap-2">
                    {draft.secondary.map((position) => (
                      <Badge key={position} variant="secondary">
                        {getPositionGroupLabel(position)}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Belum ada jabatan tambahan.
                  </p>
                )}
                {canEditProfile ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => saveProfile(member)}
                  >
                    {pending ? (
                      <Loader2 className="mr-1 size-3.5 animate-spin" />
                    ) : (
                      <Save className="mr-1 size-3.5" />
                    )}
                    Simpan
                  </Button>
                ) : null}
              </section>
              </details>

              {allowedForToday.length <= 1 ? (
                <p className="text-sm">
                  <span className="text-muted-foreground">Bertugas hari ini: </span>
                  <span className="font-medium">
                    {primary ? getPositionGroupLabel(primary) : "—"}
                  </span>
                </p>
              ) : (
              <section className="space-y-2 rounded-xl border bg-muted/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold">Bertugas hari ini</h3>
                  {canSetDuty && !(draft.active.length === 1 && draft.active[0] === primary) ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => resetToPrimary(member)}
                    >
                      <RotateCcw className="mr-1 size-3.5" /> Kembali ke jabatan utama
                    </Button>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {allowedForToday.map((position) => {
                    const selected = draft.active.includes(position);
                    return (
                      <button
                        key={position}
                        type="button"
                        disabled={!canSetDuty || pending}
                        onClick={() => toggleActive(member, position)}
                        className={cn(
                          "rounded-lg border-2 px-3 py-2 text-sm font-semibold",
                          selected
                            ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                            : "border-border bg-background text-muted-foreground",
                        )}
                      >
                        {getPositionGroupLabel(position)}
                      </button>
                    );
                  })}
                </div>

                {canSetDuty ? (
                  <Button
                    type="button"
                    className="w-full"
                    disabled={pending || !draft.active.length}
                    onClick={() => saveDuty(member)}
                  >
                    {pending ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 size-4" />
                    )}
                    Simpan posisi hari ini
                  </Button>
                ) : null}
              </section>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function formatToday(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

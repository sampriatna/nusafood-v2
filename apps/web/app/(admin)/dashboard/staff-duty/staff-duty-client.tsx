"use client";

import { useMemo, useState, useTransition } from "react";
import type { Staff } from "@nusafood/types";
import { BriefcaseBusiness, Loader2, RotateCcw, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  POSITION_GROUP_LABELS,
  REPORT_POSITION_GROUPS,
  getPositionGroupLabel,
  resolveStaffPositionGroup,
} from "@/lib/position-groups";
import { cn } from "@/lib/utils";

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

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="space-y-1 p-4 text-sm">
          <p className="font-semibold">Cara pakai</p>
          <p className="text-muted-foreground">
            Jabatan utama selalu menjadi default. Jabatan tambahan hanya berarti
            staff mampu membantu. Tugas tambahan baru masuk ke Daily Activity
            kalau dipilih di “Bertugas hari ini”.
          </p>
        </CardContent>
      </Card>

      {staff.map((member) => {
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
            <CardContent className="space-y-5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{member.name}</p>
                    <Badge variant="outline">{member.outlet}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {member.area || "Tanpa area"} · {member.staff_id}
                  </p>
                </div>
                <div className="rounded-lg bg-muted px-3 py-2 text-right">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Jabatan utama
                  </p>
                  <p className="text-sm font-semibold">
                    {primary ? getPositionGroupLabel(primary) : "Belum diatur"}
                  </p>
                </div>
              </div>

              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <BriefcaseBusiness className="size-4" />
                  <h3 className="text-sm font-semibold">Jabatan tambahan / bisa bantu</h3>
                </div>
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
                    Simpan kompetensi
                  </Button>
                ) : null}
              </section>

              <section className="space-y-2 rounded-xl border bg-muted/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold">Bertugas hari ini</h3>
                    <p className="text-xs text-muted-foreground">{today}</p>
                  </div>
                  {canSetDuty ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => resetToPrimary(member)}
                    >
                      <RotateCcw className="mr-1 size-3.5" /> Default
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
                    Aktifkan posisi hari ini
                  </Button>
                ) : null}
              </section>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

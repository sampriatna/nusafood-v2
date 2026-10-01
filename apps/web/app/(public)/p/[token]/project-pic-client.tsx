"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, ChevronDown, Loader2, Lock, MessageSquare, Send, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { checkMilestoneSubmit, deadlineState } from "@/lib/project-logic";
import {
  apiCall,
  formatDeadline,
  formatStamp,
  MILESTONE_LABEL,
  milestoneBadgeClass,
} from "@/lib/project-ui";
import type {
  ProjectMilestoneDto,
  ProjectMilestoneStepDto,
  ProjectPicViewDto,
} from "@/lib/project-types";
import { cn } from "@/lib/utils";

function todayWib(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

export function ProjectPicClient({ token }: { token: string }) {
  const { toast } = useToast();
  const [data, setData] = useState<ProjectPicViewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = useRef(false);

  const load = useCallback(async () => {
    try {
      const view = await apiCall<ProjectPicViewDto>(`/api/project-pic/by-token/${encodeURIComponent(token)}`);
      setData(view);
      setFatal(null);
      if (!opened.current && view.focus) {
        setOpenId(view.focus.milestone_id);
        opened.current = true;
      }
    } catch (error) {
      setFatal(error instanceof Error ? error.message : "Link project tidak valid atau sudah dinonaktifkan.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusyKey(key);
    try {
      await fn();
    } catch (error) {
      toast({
        title: "Belum tersimpan",
        description: error instanceof Error ? error.message : "Coba lagi",
        variant: "destructive",
      });
    } finally {
      await load(); // selalu sinkron dengan server: owner mungkin mengubah data di tengah jalan
      setBusyKey(null);
    }
  }

  const patchStep = (stepId: string, patch: Record<string, unknown>) =>
    run(stepId, () =>
      apiCall(`/api/project-pic/steps/${stepId}`, { method: "PATCH", body: JSON.stringify({ token, ...patch }) }),
    );

  const upload = (stepId: string, file?: File) => {
    if (!file) return;
    return run(`up-${stepId}`, async () => {
      const form = new FormData();
      form.set("token", token);
      form.set("step_id", stepId);
      form.set("file", file);
      const response = await fetch("/api/project-pic/upload", { method: "POST", body: form });
      const json = await response.json();
      if (!json.success) throw new Error(json.error || "Gagal upload bukti");
    });
  };

  const submit = (milestoneId: string) =>
    run(`submit-${milestoneId}`, async () => {
      await apiCall(`/api/project-pic/milestones/${milestoneId}/submit`, {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      toast({ title: "Berhasil diajukan", description: "Owner akan memeriksa pekerjaanmu." });
    });

  const reportBlocker = (milestoneId: string, text: string) =>
    run(`blk-${milestoneId}`, async () => {
      await apiCall(`/api/project-pic/milestones/${milestoneId}/blockers`, {
        method: "POST",
        body: JSON.stringify({ token, text }),
      });
      toast({ title: "Kendala dilaporkan" });
    });

  const resolveBlocker = (blockerId: string) =>
    run(`res-${blockerId}`, () =>
      apiCall(`/api/project-pic/blockers/${blockerId}/resolve`, {
        method: "POST",
        body: JSON.stringify({ token }),
      }),
    );

  const milestones = useMemo(
    () => data?.workstreams.flatMap((w) => w.milestones.map((m) => ({ ws: w, m }))) ?? [],
    [data],
  );

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Memuat project…
        </div>
      </Shell>
    );
  }

  if (fatal || !data) {
    return (
      <Shell>
        <div className="rounded-2xl border bg-card p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 size-8 text-amber-600" />
          <h1 className="text-lg font-bold">Project tidak bisa dibuka</h1>
          <p className="mt-2 text-sm text-muted-foreground">{fatal || "Link project tidak valid atau sudah dinonaktifkan."}</p>
        </div>
      </Shell>
    );
  }

  if (data.state === "PREPARING") {
    return (
      <Shell>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Project NF3 · PIC {data.staff.name}
        </p>
        <div className="mt-3 rounded-2xl border-2 border-violet-200 bg-violet-50 p-6 text-center">
          <h1 className="text-lg font-bold text-violet-950">PROJECT SEDANG DISIAPKAN</h1>
          <p className="mt-2 text-sm text-violet-900/80">
            Belum ada pekerjaan yang dipublish untuk kamu. PIC utama / owner sedang menyusun milestone dan checklist.
          </p>
          <p className="mt-3 text-sm font-semibold">{data.project.name}</p>
        </div>
      </Shell>
    );
  }

  const today = todayWib();
  const singleWorkstream = data.workstreams.length === 1;
  const revisions = milestones.filter((x) => x.m.status === "REVISION");

  return (
    <Shell>
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Project NF3 · PIC {data.staff.name}
      </p>
      <h1 className="mt-1 text-2xl font-bold leading-tight">{data.project.name}</h1>
      {data.project.goal ? (
        <p className="mt-2 text-sm">
          <span className="font-semibold">Goal: </span>
          {data.project.goal}
        </p>
      ) : null}
      <p className="mt-1 text-sm text-muted-foreground">Deadline: {formatDeadline(data.project.deadline)}</p>

      <section className="mt-4 rounded-2xl border bg-card p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {data.scope === "ALL" ? "Progress project" : "Progress tanggung jawab saya"}
        </p>
        <div className="mt-1 flex items-end justify-between">
          <span className="text-4xl font-bold leading-none">{data.project.progress}%</span>
          <span className="text-sm text-muted-foreground">
            {data.project.milestone_done} / {data.project.milestone_total} milestone disetujui
          </span>
        </div>
        <Progress className="mt-3" value={data.project.progress} />
        {singleWorkstream ? (
          <p className="mt-3 text-sm">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Bagian saya </span>
            {data.workstreams[0].name}
          </p>
        ) : null}
      </section>

      {revisions.map(({ m }) => (
        <button
          key={m.id}
          type="button"
          onClick={() => setOpenId(m.id)}
          className="mt-3 w-full rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-left"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-red-700">Perlu revisi</p>
          <p className="font-bold leading-snug text-red-950">{m.title}</p>
          {m.latest_review?.review_note ? (
            <p className="mt-1 text-sm text-red-900">
              <span className="font-semibold">Catatan owner: </span>
              {m.latest_review.review_note}
            </p>
          ) : null}
        </button>
      ))}

      {data.focus ? (
        <section className="mt-3 rounded-2xl border-2 border-primary/40 bg-primary/5 p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
            <Target className="size-3.5" /> Fokus sekarang
          </p>
          <p className="mt-1 text-lg font-bold leading-snug">{data.focus.milestone_title}</p>
          {data.focus.step_text ? (
            <p className="mt-1 text-sm">
              <span className="font-semibold">Langkah berikutnya: </span>
              {data.focus.step_text}
            </p>
          ) : (
            <p className="mt-1 text-sm">Semua langkah sudah dicentang. Cek bukti lalu ajukan validasi.</p>
          )}
          <Button className="mt-3 w-full" variant="outline" onClick={() => setOpenId(data.focus!.milestone_id)}>
            Buka milestone
          </Button>
        </section>
      ) : milestones.length && milestones.every((x) => x.m.status === "DONE" || x.m.status === "WAITING_VALIDATION") ? (
        <section className="mt-3 rounded-2xl border bg-card p-4 text-sm">
          {milestones.every((x) => x.m.status === "DONE")
            ? "Semua milestone sudah disetujui. Kerja bagus!"
            : "Semua yang bisa kamu kerjakan sudah diajukan. Tunggu validasi owner."}
        </section>
      ) : null}

      {data.blockers.length ? (
        <section className="mt-3 space-y-2">
          {data.blockers.map((b) => (
            <div key={b.id} className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
              <p className="text-[11px] font-bold uppercase tracking-wide text-red-700">Kendala aktif</p>
              <p className="mt-0.5">{b.text}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {b.milestone_title} · {b.reported_by_name}, {formatStamp(b.created_at)}
              </p>
              <Button size="sm" variant="outline" className="mt-2" disabled={busyKey === `res-${b.id}`} onClick={() => resolveBlocker(b.id)}>
                Sudah teratasi
              </Button>
            </div>
          ))}
        </section>
      ) : null}

      <div className="mt-5 space-y-5">
        {data.workstreams.map((ws) => (
          <section key={ws.id}>
            {!singleWorkstream ? (
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide">{ws.name}</h2>
                <span className="text-xs text-muted-foreground">
                  {ws.owner_name ? `PIC ${ws.owner_name} · ` : ""}
                  {ws.progress}%
                </span>
              </div>
            ) : null}
            <div className="space-y-3">
              {ws.milestones.map((m, i) => (
                <MilestoneBlock
                  key={m.id}
                  index={i + 1}
                  milestone={m}
                  today={today}
                  open={openId === m.id}
                  onToggle={() => setOpenId(openId === m.id ? null : m.id)}
                  busyKey={busyKey}
                  onPatchStep={patchStep}
                  onUpload={upload}
                  onSubmit={() => submit(m.id)}
                  onBlocker={(text) => reportBlocker(m.id, text)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-5">
      <div className="mx-auto max-w-lg pb-24">{children}</div>
    </main>
  );
}

function MilestoneBlock({
  index,
  milestone: m,
  today,
  open,
  onToggle,
  busyKey,
  onPatchStep,
  onUpload,
  onSubmit,
  onBlocker,
}: {
  index: number;
  milestone: ProjectMilestoneDto;
  today: string;
  open: boolean;
  onToggle: () => void;
  busyKey: string | null;
  onPatchStep: (stepId: string, patch: Record<string, unknown>) => void;
  onUpload: (stepId: string, file?: File) => void;
  onSubmit: () => void;
  onBlocker: (text: string) => void;
}) {
  const locked = m.status === "WAITING_VALIDATION" || m.status === "DONE";
  const done = m.steps.filter((s) => s.is_checked).length;
  const check = checkMilestoneSubmit(m.steps);
  const dl = deadlineState(m.deadline, today, m.status === "DONE");
  const [blockerText, setBlockerText] = useState("");
  const [showBlocker, setShowBlocker] = useState(false);

  return (
    <article className="overflow-hidden rounded-2xl border bg-card">
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 p-4 text-left">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">{index}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold leading-snug">{m.title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className={cn("rounded-full px-2 py-0.5 font-semibold", milestoneBadgeClass(m.status))}>{MILESTONE_LABEL[m.status]}</span>
            <span>
              Langkah {done}/{m.steps.length}
            </span>
            {m.deadline ? (
              <span className={cn(dl === "overdue" && "font-bold text-red-700", dl === "soon" && "font-bold text-amber-700")}>
                {dl === "overdue" ? "Terlambat · " : "Deadline "}
                {formatDeadline(m.deadline)}
              </span>
            ) : null}
          </span>
        </span>
        <ChevronDown className={cn("mt-1 size-5 shrink-0 transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="space-y-4 border-t p-4">
          {m.description ? <p className="text-sm text-muted-foreground">{m.description}</p> : null}

          {m.status === "REVISION" && m.latest_review?.review_note ? (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-950">
              <p className="text-xs font-bold uppercase text-red-700">Perlu revisi</p>
              <p className="mt-0.5">
                <span className="font-semibold">Catatan owner: </span>
                {m.latest_review.review_note}
              </p>
            </div>
          ) : null}
          {m.status === "WAITING_VALIDATION" ? (
            <p className="flex items-center gap-2 rounded-xl bg-sky-50 p-3 text-sm text-sky-950">
              <Lock className="size-4 shrink-0" /> Milestone sedang menunggu validasi. Checklist dikunci sampai owner memeriksa.
            </p>
          ) : null}
          {m.status === "DONE" ? (
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-950">Disetujui. Milestone ini sudah selesai.</p>
          ) : null}

          <ul className="space-y-3">
            {m.steps.map((s) => (
              <StepRow key={s.id} step={s} locked={locked} busyKey={busyKey} onPatch={onPatchStep} onUpload={onUpload} />
            ))}
          </ul>

          {!locked ? (
            <div className="space-y-2">
              {!check.canSubmit ? (
                <div className="rounded-xl bg-muted p-3 text-sm">
                  <p className="font-semibold">Belum bisa diajukan.</p>
                  <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                    {check.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <Button className="h-12 w-full text-base" disabled={!check.canSubmit || busyKey === `submit-${m.id}`} onClick={onSubmit}>
                {busyKey === `submit-${m.id}` ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
                Ajukan Validasi
              </Button>
            </div>
          ) : null}

          {m.status !== "DONE" ? (
            <div>
              {!showBlocker ? (
                <button type="button" className="text-sm font-medium text-red-700 underline-offset-2 hover:underline" onClick={() => setShowBlocker(true)}>
                  Ada kendala? Laporkan
                </button>
              ) : (
                <div className="space-y-2 rounded-xl border p-3">
                  <Textarea value={blockerText} onChange={(e) => setBlockerText(e.target.value)} placeholder="Contoh: Supplier belum kasih harga." rows={3} />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowBlocker(false)}>
                      Batal
                    </Button>
                    <Button
                      size="sm"
                      disabled={!blockerText.trim() || busyKey === `blk-${m.id}`}
                      onClick={() => {
                        onBlocker(blockerText);
                        setBlockerText("");
                        setShowBlocker(false);
                      }}
                    >
                      Kirim kendala
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function StepRow({
  step: s,
  locked,
  busyKey,
  onPatch,
  onUpload,
}: {
  step: ProjectMilestoneStepDto;
  locked: boolean;
  busyKey: string | null;
  onPatch: (stepId: string, patch: Record<string, unknown>) => void;
  onUpload: (stepId: string, file?: File) => void;
}) {
  const [note, setNote] = useState(s.note);
  const [showNote, setShowNote] = useState(Boolean(s.note));
  const busy = busyKey === s.id || busyKey === `up-${s.id}`;
  useEffect(() => setNote(s.note), [s.note]);

  return (
    <li className="rounded-xl border p-3">
      <label className={cn("flex items-start gap-3", locked && "opacity-70")}>
        <input
          type="checkbox"
          className="mt-0.5 size-6 shrink-0 accent-emerald-600"
          checked={s.is_checked}
          disabled={locked || busy}
          onChange={(e) => onPatch(s.id, { is_checked: e.target.checked })}
        />
        <span className="min-w-0 flex-1 leading-snug">
          <span className={cn("block font-medium", s.is_checked && "text-muted-foreground line-through")}>{s.item_text}</span>
          <span className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            {!s.is_required ? <span>Opsional</span> : null}
            {s.requires_evidence ? (
              <span className={cn("inline-flex items-center gap-1 font-semibold", s.evidence_url ? "text-emerald-700" : "text-amber-700")}>
                <Camera className="size-3" /> {s.evidence_url ? "Bukti terunggah" : "Bukti wajib"}
              </span>
            ) : null}
          </span>
        </span>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
      </label>

      {s.evidence_url ? (
        <a href={s.evidence_url} target="_blank" rel="noreferrer" className="mt-2 block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.evidence_url} alt="Bukti" className="max-h-40 rounded-lg border object-cover" />
        </a>
      ) : null}

      {!locked ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {s.requires_evidence || s.evidence_url ? (
            <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-sm font-medium active:scale-[0.98]">
              <Camera className="size-4" />
              {s.evidence_url ? "Ganti bukti" : "Upload foto"}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  onUpload(s.id, e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          ) : null}
          <button
            type="button"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium"
            onClick={() => setShowNote((v) => !v)}
          >
            <MessageSquare className="size-4" />
            {s.note ? "Catatan" : "Tambah catatan"}
          </button>
        </div>
      ) : s.note ? (
        <p className="mt-2 text-xs italic text-muted-foreground">Catatan: {s.note}</p>
      ) : null}

      {showNote && !locked ? (
        <Textarea
          className="mt-2"
          rows={2}
          value={note}
          placeholder="Catatan untuk langkah ini"
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note.trim() !== s.note.trim() && onPatch(s.id, { note })}
        />
      ) : null}
    </li>
  );
}

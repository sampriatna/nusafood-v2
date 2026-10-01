"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Camera, ChevronDown, History, Lock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { isStructureLocked, deadlineState } from "@/lib/project-logic";
import {
  apiCall,
  formatDeadline,
  formatStamp,
  MILESTONE_LABEL,
  milestoneBadgeClass,
} from "@/lib/project-ui";
import type { ProjectMilestoneDto } from "@/lib/project-types";
import { cn } from "@/lib/utils";

type Props = {
  milestone: ProjectMilestoneDto;
  todayKey: string;
  onChanged: () => void;
  onReview: (milestone: ProjectMilestoneDto) => void;
  onEdit: (milestone: ProjectMilestoneDto) => void;
};

export function MilestoneCard({ milestone: m, todayKey, onChanged, onReview, onEdit }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [newStep, setNewStep] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = isStructureLocked(m.status);
  const done = m.steps.filter((s) => s.is_checked).length;
  const dl = deadlineState(m.deadline, todayKey, m.status === "DONE");

  async function run(fn: () => Promise<unknown>, okMessage?: string) {
    setBusy(true);
    try {
      await fn();
      if (okMessage) toast({ title: okMessage });
      onChanged();
    } catch (error) {
      toast({
        title: "Belum berhasil",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  const addStep = () => {
    const raw = newStep.trim();
    if (!raw) return;
    const evidence = /\[foto\]/i.test(raw);
    void run(async () => {
      await apiCall(`/api/projects/milestones/${m.id}/steps`, {
        method: "POST",
        body: JSON.stringify({ item_text: raw.replace(/\[foto\]/gi, "").trim(), requires_evidence: evidence }),
      });
      setNewStep("");
    });
  };

  return (
    <div className="rounded-lg border bg-card">
      <button type="button" className="flex w-full items-start gap-3 p-3 text-left" onClick={() => setOpen((v) => !v)}>
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-snug">{m.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className={cn("rounded-full px-2 py-0.5 font-medium", milestoneBadgeClass(m.status))}>
              {MILESTONE_LABEL[m.status]}
            </span>
            <span>
              Langkah {done}/{m.steps.length}
            </span>
            {m.deadline ? (
              <span className={cn(dl === "overdue" && "font-semibold text-red-700", dl === "soon" && "font-semibold text-amber-700")}>
                {dl === "overdue" ? "Terlambat · " : ""}
                {formatDeadline(m.deadline)}
              </span>
            ) : null}
            {m.weight !== 1 ? <span>Bobot {m.weight}</span> : null}
            {m.active_blockers ? <span className="font-semibold text-red-700">{m.active_blockers} kendala</span> : null}
          </div>
        </div>
        <ChevronDown className={cn("mt-1 size-4 shrink-0 transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="space-y-3 border-t p-3">
          {m.description ? <p className="text-sm text-muted-foreground">{m.description}</p> : null}

          {m.status === "REVISION" && m.latest_review?.review_note ? (
            <p className="rounded-md bg-red-50 p-2 text-sm text-red-900">
              <strong>Catatan revisi:</strong> {m.latest_review.review_note}
            </p>
          ) : null}

          {locked ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="size-3.5" /> Checklist terkunci
              {m.status === "WAITING_VALIDATION" ? " selama menunggu validasi." : " karena sudah disetujui."}
            </p>
          ) : null}

          <ul className="space-y-1.5">
            {m.steps.map((s, i) => (
              <li key={s.id} className="flex items-start gap-2 rounded-md bg-muted/40 p-2 text-sm">
                <span className={cn("mt-0.5 shrink-0", s.is_checked ? "text-emerald-600" : "text-muted-foreground")}>
                  {s.is_checked ? "☑" : "☐"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="leading-snug">{s.item_text}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                    <button
                      type="button"
                      disabled={locked || busy}
                      className={cn("rounded border px-1.5 py-0.5", s.is_required ? "border-primary/40 text-primary" : "text-muted-foreground")}
                      onClick={() =>
                        run(() =>
                          apiCall(`/api/projects/milestone-steps/${s.id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ is_required: !s.is_required }),
                          }),
                        )
                      }
                    >
                      {s.is_required ? "Wajib" : "Opsional"}
                    </button>
                    <button
                      type="button"
                      disabled={locked || busy}
                      className={cn(
                        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5",
                        s.requires_evidence ? "border-amber-400 text-amber-800" : "text-muted-foreground",
                      )}
                      onClick={() =>
                        run(() =>
                          apiCall(`/api/projects/milestone-steps/${s.id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ requires_evidence: !s.requires_evidence }),
                          }),
                        )
                      }
                    >
                      <Camera className="size-3" />
                      {s.requires_evidence ? "Bukti wajib" : "Tanpa bukti"}
                    </button>
                    {s.evidence_url ? (
                      <a href={s.evidence_url} target="_blank" rel="noreferrer" className="rounded border px-1.5 py-0.5 text-sky-700 underline">
                        Lihat bukti
                      </a>
                    ) : null}
                  </div>
                  {s.note ? <p className="mt-1 text-xs italic text-muted-foreground">Catatan PIC: {s.note}</p> : null}
                </div>
                {!locked ? (
                  <div className="flex shrink-0 flex-col">
                    <button type="button" disabled={busy || i === 0} aria-label="Naikkan" className="p-1 disabled:opacity-30" onClick={() => run(() => apiCall(`/api/projects/milestone-steps/${s.id}`, { method: "PATCH", body: JSON.stringify({ move: "up" }) }))}>
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button type="button" disabled={busy || i === m.steps.length - 1} aria-label="Turunkan" className="p-1 disabled:opacity-30" onClick={() => run(() => apiCall(`/api/projects/milestone-steps/${s.id}`, { method: "PATCH", body: JSON.stringify({ move: "down" }) }))}>
                      <ArrowDown className="size-3.5" />
                    </button>
                    <button type="button" disabled={busy} aria-label="Hapus langkah" className="p-1 text-destructive" onClick={() => run(() => apiCall(`/api/projects/milestone-steps/${s.id}`, { method: "DELETE" }))}>
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          {!locked ? (
            <div className="flex gap-2">
              <Input
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                placeholder="Tambah langkah (akhiri [foto] bila wajib bukti)"
                onKeyDown={(e) => e.key === "Enter" && addStep()}
              />
              <Button type="button" size="icon" variant="outline" disabled={busy || !newStep.trim()} onClick={addStep} aria-label="Tambah langkah">
                <Plus className="size-4" />
              </Button>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {m.status === "WAITING_VALIDATION" ? (
              <Button size="sm" onClick={() => onReview(m)}>
                Review & Validasi
              </Button>
            ) : null}
            {!locked ? (
              <Button size="sm" variant="outline" onClick={() => onEdit(m)}>
                Edit milestone
              </Button>
            ) : null}
            {m.status === "NOT_STARTED" ? (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Hapus milestone “${m.title}”?`)) {
                    void run(() => apiCall(`/api/projects/milestones/${m.id}`, { method: "DELETE" }), "Milestone dihapus");
                  }
                }}
              >
                Hapus
              </Button>
            ) : null}
            {m.status === "DONE" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  const note = window.prompt("Alasan membuka kembali milestone ini?");
                  if (note?.trim()) {
                    void run(
                      () => apiCall(`/api/projects/milestones/${m.id}/reopen`, { method: "POST", body: JSON.stringify({ note }) }),
                      "Milestone dibuka kembali",
                    );
                  }
                }}
              >
                Buka kembali
              </Button>
            ) : null}
          </div>

          {m.reviews.length ? (
            <details className="text-sm">
              <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <History className="size-3.5" /> Riwayat pengajuan ({m.reviews.length})
              </summary>
              <ol className="mt-2 space-y-2">
                {[...m.reviews].reverse().map((r, idx) => (
                  <li key={r.id} className="rounded-md border p-2 text-xs">
                    <p className="font-semibold">
                      Pengajuan {idx + 1} ·{" "}
                      {r.status === "APPROVED" ? "Disetujui" : r.status === "REVISION" ? "Direvisi" : "Menunggu"}
                    </p>
                    <p className="text-muted-foreground">
                      {r.submitted_by_name} · {formatStamp(r.submitted_at)}
                      {r.reviewed_at ? ` → ${r.reviewed_by_name || "Owner"} · ${formatStamp(r.reviewed_at)}` : ""}
                    </p>
                    {r.review_note ? <p className="mt-1">Catatan: {r.review_note}</p> : null}
                  </li>
                ))}
              </ol>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

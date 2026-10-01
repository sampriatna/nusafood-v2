"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Circle,
  Clock3,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type {
  MilestoneStatus,
  ProjectMilestoneDto,
  ProjectPicViewDto,
} from "@/lib/project-types";

type ApiResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

const STATUS_LABEL: Record<MilestoneStatus, string> = {
  NOT_STARTED: "Belum mulai",
  IN_PROGRESS: "Sedang dikerjakan",
  WAITING_VALIDATION: "Menunggu validasi",
  REVISION: "Perlu revisi",
  DONE: "Disetujui",
  BLOCKED: "Terhambat",
};

function statusClass(status: MilestoneStatus) {
  if (status === "DONE") return "bg-emerald-100 text-emerald-800";
  if (status === "WAITING_VALIDATION") return "bg-sky-100 text-sky-800";
  if (status === "REVISION" || status === "BLOCKED")
    return "bg-red-100 text-red-800";
  if (status === "IN_PROGRESS") return "bg-amber-100 text-amber-800";
  return "bg-muted text-muted-foreground";
}

function milestoneReady(milestone: ProjectMilestoneDto) {
  if (!milestone.steps.length) return false;
  return milestone.steps.every((step) => {
    if (step.is_required && !step.is_checked) return false;
    if (step.requires_evidence && !step.evidence_url) return false;
    return true;
  });
}

export function ProjectPicClient({ token }: { token: string }) {
  const { toast } = useToast();
  const [data, setData] = useState<ProjectPicViewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [uploadingStep, setUploadingStep] = useState<string | null>(null);
  const [savingStep, setSavingStep] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/project-pic/by-token/${encodeURIComponent(token)}`,
        { cache: "no-store" },
      );
      const json = (await response.json()) as ApiResponse<ProjectPicViewDto>;
      if (!json.success) throw new Error(json.error);
      setData(json.data);

      const notes: Record<string, string> = {};
      for (const workstream of json.data.workstreams) {
        for (const milestone of workstream.milestones) {
          for (const step of milestone.steps) {
            notes[step.id] = step.note || "";
          }
        }
      }
      setNoteDrafts(notes);
    } catch (error) {
      toast({
        title: "Project tidak bisa dibuka",
        description: error instanceof Error ? error.message : "Link tidak valid",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const assignedMilestones = useMemo(
    () =>
      data?.workstreams.reduce(
        (sum, workstream) => sum + workstream.milestones.length,
        0,
      ) || 0,
    [data],
  );

  async function patchStep(
    stepId: string,
    patch: {
      is_checked?: boolean;
      note?: string | null;
      evidence_url?: string | null;
    },
  ) {
    setSavingStep(stepId);
    try {
      const response = await fetch(`/api/project-pic/steps/${stepId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...patch }),
      });
      const json = (await response.json()) as ApiResponse<unknown>;
      if (!json.success) throw new Error(json.error);
      await load();
    } catch (error) {
      toast({
        title: "Belum tersimpan",
        description: error instanceof Error ? error.message : "Coba lagi",
        variant: "destructive",
      });
    } finally {
      setSavingStep(null);
    }
  }

  async function uploadEvidence(stepId: string, file?: File) {
    if (!file) return;
    setUploadingStep(stepId);
    try {
      const form = new FormData();
      form.set("token", token);
      form.set("step_id", stepId);
      form.set("file", file);

      const response = await fetch("/api/project-pic/upload", {
        method: "POST",
        body: form,
      });
      const json = (await response.json()) as ApiResponse<{ url: string }>;
      if (!json.success) throw new Error(json.error);
      toast({ title: "Bukti tersimpan" });
      await load();
    } catch (error) {
      toast({
        title: "Upload bukti gagal",
        description: error instanceof Error ? error.message : "Coba lagi",
        variant: "destructive",
      });
    } finally {
      setUploadingStep(null);
    }
  }

  async function submitMilestone(milestoneId: string) {
    setSubmittingId(milestoneId);
    try {
      const response = await fetch(
        `/api/project-pic/milestones/${milestoneId}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        },
      );
      const json = (await response.json()) as ApiResponse<unknown>;
      if (!json.success) throw new Error(json.error);
      toast({
        title: "Milestone diajukan",
        description: "Menunggu validasi owner/leader.",
      });
      await load();
    } catch (error) {
      toast({
        title: "Belum bisa diajukan",
        description: error instanceof Error ? error.message : "Coba lagi",
        variant: "destructive",
      });
    } finally {
      setSubmittingId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-10">
        <div className="mx-auto flex max-w-lg items-center justify-center gap-2 rounded-2xl bg-card p-8 text-sm text-muted-foreground shadow-sm">
          <Loader2 className="size-4 animate-spin" />
          Memuat project…
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-muted/30 px-4 py-10">
        <div className="mx-auto max-w-lg rounded-2xl border bg-card p-8 text-center">
          <AlertTriangle className="mx-auto mb-3 size-8 text-destructive" />
          <h1 className="font-bold">Link project tidak tersedia</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Minta PIC utama atau owner mengirim link yang aktif.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/30 pb-10">
      <section className="border-b bg-card px-4 py-5">
        <div className="mx-auto max-w-lg space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              Project NF3 · PIC {data.staff.name}
            </p>
            <h1 className="mt-1 text-2xl font-bold">{data.project.name}</h1>
            {data.project.goal ? (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                <strong>Goal:</strong> {data.project.goal}
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border bg-muted/30 p-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>Progress project</span>
              <strong>{data.project.progress}%</strong>
            </div>
            <Progress value={data.project.progress} />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{data.workstreams.length} workstream kamu</span>
              <span>{assignedMilestones} milestone</span>
              {data.project.deadline ? (
                <span>Deadline {data.project.deadline}</span>
              ) : null}
            </div>
          </div>

          {data.project.next_action ? (
            <div className="rounded-xl bg-sky-50 p-3 text-sm text-sky-950">
              <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
                Fokus berikutnya
              </p>
              <p className="mt-1 font-medium">{data.project.next_action}</p>
            </div>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-lg space-y-4 px-4 py-4">
        {data.workstreams.map((workstream) => (
          <Card key={workstream.id} className="overflow-hidden">
            <CardHeader className="border-b bg-card pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Workstream
                  </p>
                  <CardTitle className="mt-1 text-lg">{workstream.name}</CardTitle>
                  {workstream.next_action ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Next: {workstream.next_action}
                    </p>
                  ) : null}
                </div>
                <strong className="text-lg">{workstream.progress}%</strong>
              </div>
              <Progress value={workstream.progress} />
            </CardHeader>

            <CardContent className="space-y-4 p-4">
              {workstream.milestones.length === 0 ? (
                <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                  Belum ada milestone yang diberikan.
                </p>
              ) : (
                workstream.milestones.map((milestone, milestoneIndex) => {
                  const locked =
                    milestone.status === "WAITING_VALIDATION" ||
                    milestone.status === "DONE";
                  const ready = milestoneReady(milestone);
                  const doneSteps = milestone.steps.filter(
                    (step) => step.is_checked,
                  ).length;

                  return (
                    <section
                      key={milestone.id}
                      className="rounded-xl border bg-background p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                            {milestoneIndex + 1}
                          </span>
                          <div className="min-w-0">
                            <h2 className="font-bold leading-snug">
                              {milestone.title}
                            </h2>
                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span>
                                {doneSteps}/{milestone.steps.length} langkah
                              </span>
                              {milestone.deadline ? (
                                <span>· deadline {milestone.deadline}</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${statusClass(
                            milestone.status,
                          )}`}
                        >
                          {STATUS_LABEL[milestone.status]}
                        </span>
                      </div>

                      {milestone.latest_review?.status === "REVISION" ? (
                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                          <p className="font-bold">Perlu diperbaiki</p>
                          <p className="mt-1">
                            {milestone.latest_review.review_note ||
                              "Periksa kembali hasil pekerjaan."}
                          </p>
                        </div>
                      ) : null}

                      {milestone.status === "WAITING_VALIDATION" ? (
                        <div className="mt-3 flex items-start gap-2 rounded-lg bg-sky-50 p-3 text-sm text-sky-900">
                          <Clock3 className="mt-0.5 size-4 shrink-0" />
                          Hasil sudah dikirim. Tunggu owner/leader memvalidasi.
                        </div>
                      ) : null}

                      {milestone.status === "DONE" ? (
                        <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                          Milestone sudah disetujui dan masuk ke progress project.
                        </div>
                      ) : null}

                      <div className="mt-4 space-y-3">
                        {milestone.steps.length === 0 ? (
                          <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                            Owner belum membuat checklist langkah untuk milestone ini.
                          </div>
                        ) : (
                          milestone.steps.map((step, stepIndex) => (
                            <div
                              key={step.id}
                              className="rounded-lg border p-3"
                            >
                              <label className="flex cursor-pointer items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={step.is_checked}
                                  disabled={locked || savingStep === step.id}
                                  onChange={(event) =>
                                    void patchStep(step.id, {
                                      is_checked: event.target.checked,
                                      note: noteDrafts[step.id] || null,
                                    })
                                  }
                                  className="mt-1 size-5 accent-black"
                                />
                                <div className="min-w-0 flex-1">
                                  <p
                                    className={
                                      step.is_checked
                                        ? "text-sm font-medium line-through opacity-70"
                                        : "text-sm font-medium"
                                    }
                                  >
                                    {stepIndex + 1}. {step.item_text}
                                  </p>
                                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                                    {step.is_required ? (
                                      <span>Wajib</span>
                                    ) : (
                                      <span>Opsional</span>
                                    )}
                                    {step.requires_evidence ? (
                                      <span>· Bukti foto wajib</span>
                                    ) : null}
                                  </div>
                                </div>
                                {step.is_checked ? (
                                  <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                                ) : (
                                  <Circle className="size-5 shrink-0 text-muted-foreground" />
                                )}
                              </label>

                              <div className="mt-3 space-y-2 pl-8">
                                <Textarea
                                  value={noteDrafts[step.id] || ""}
                                  disabled={locked}
                                  onChange={(event) =>
                                    setNoteDrafts((current) => ({
                                      ...current,
                                      [step.id]: event.target.value,
                                    }))
                                  }
                                  placeholder="Catatan hasil / kendala…"
                                  className="min-h-16 text-sm"
                                />
                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={locked || savingStep === step.id}
                                    onClick={() =>
                                      void patchStep(step.id, {
                                        note: noteDrafts[step.id] || null,
                                      })
                                    }
                                  >
                                    {savingStep === step.id ? (
                                      <Loader2 className="mr-1 size-3.5 animate-spin" />
                                    ) : null}
                                    Simpan catatan
                                  </Button>

                                  <label className="inline-flex cursor-pointer items-center">
                                    <Input
                                      type="file"
                                      accept="image/*"
                                      capture="environment"
                                      className="hidden"
                                      disabled={locked || uploadingStep === step.id}
                                      onChange={(event) => {
                                        const file = event.target.files?.[0];
                                        void uploadEvidence(step.id, file);
                                        event.currentTarget.value = "";
                                      }}
                                    />
                                    <span className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium">
                                      {uploadingStep === step.id ? (
                                        <Loader2 className="mr-1.5 size-4 animate-spin" />
                                      ) : (
                                        <Camera className="mr-1.5 size-4" />
                                      )}
                                      {step.evidence_url
                                        ? "Ganti bukti"
                                        : "Upload bukti"}
                                    </span>
                                  </label>

                                  {step.evidence_url ? (
                                    <a
                                      href={step.evidence_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs font-medium text-primary underline"
                                    >
                                      Lihat bukti
                                    </a>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {!locked ? (
                        <div className="mt-4 border-t pt-4">
                          <Button
                            className="w-full"
                            disabled={
                              !ready || submittingId === milestone.id
                            }
                            onClick={() => void submitMilestone(milestone.id)}
                          >
                            {submittingId === milestone.id ? (
                              <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : (
                              <Send className="mr-2 size-4" />
                            )}
                            Ajukan Validasi Milestone
                          </Button>
                          {!ready ? (
                            <p className="mt-2 text-center text-xs text-muted-foreground">
                              Selesaikan langkah wajib dan bukti yang diminta sebelum mengajukan.
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </section>
                  );
                })
              )}
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" className="w-full" onClick={() => void load()}>
          <RefreshCw className="mr-2 size-4" />
          Refresh progress
        </Button>
      </div>
    </main>
  );
}

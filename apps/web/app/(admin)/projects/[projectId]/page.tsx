"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Copy,
  CopyPlus,
  Link2,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  ShieldOff,
  Trash2,
} from "lucide-react";
import { AdminPage } from "@/components/admin-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { todayKeyInAppTz } from "@/lib/format-datetime";
import { deadlineState, weightWarning } from "@/lib/project-logic";
import {
  absoluteUrl,
  apiCall,
  formatDeadline,
  formatStamp,
  HEALTH_LABEL,
  healthBadgeClass,
  PROJECT_STATUS_LABEL,
} from "@/lib/project-ui";
import type { LinkedTaskDto } from "@/lib/services/project-structure.service";
import type {
  ProjectDetailDto,
  ProjectMilestoneDto,
  ProjectPicLinkDto,
  ProjectPicWorkloadDto,
  ProjectStaffOption,
  ProjectWorkstreamDto,
} from "@/lib/project-types";
import { cn } from "@/lib/utils";
import {
  EditProjectDialog,
  MilestoneDialog,
  PicWorkloadDialog,
  ReviewDialog,
  WorkstreamDialog,
} from "./dialogs";
import { MilestoneCard } from "./milestone-card";

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [tasks, setTasks] = useState<LinkedTaskDto[]>([]);
  const [taskInput, setTaskInput] = useState({ task_id: "", milestone_id: "" });
  const { toast } = useToast();
  const [project, setProject] = useState<ProjectDetailDto | null>(null);
  const [staff, setStaff] = useState<ProjectStaffOption[]>([]);
  const [links, setLinks] = useState<ProjectPicLinkDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [editProject, setEditProject] = useState(false);
  const [wsDialog, setWsDialog] = useState<{ open: boolean; ws: ProjectWorkstreamDto | null }>({ open: false, ws: null });
  const [msDialog, setMsDialog] = useState<{ open: boolean; wsId: string; ms: ProjectMilestoneDto | null }>({
    open: false,
    wsId: "",
    ms: null,
  });
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [workload, setWorkload] = useState<ProjectPicWorkloadDto | null>(null);
  const todayKey = todayKeyInAppTz();

  const load = useCallback(async () => {
    try {
      const [detail, options, picLinks, linked] = await Promise.all([
        apiCall<ProjectDetailDto>(`/api/projects/${projectId}`),
        apiCall<ProjectStaffOption[]>("/api/projects/staff-options"),
        apiCall<ProjectPicLinkDto[]>(`/api/projects/${projectId}/pic-links`),
        apiCall<LinkedTaskDto[]>(`/api/projects/${projectId}/tasks`),
      ]);
      setTasks(linked);
      setProject(detail);
      setStaff(options);
      setLinks(picLinks);
    } catch (error) {
      toast({
        title: "Project tidak bisa dimuat",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  // Buka dialog review langsung dari inbox (?review=<milestoneId>).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("review");
    if (id) setReviewId(id);
  }, []);

  const allMilestones = useMemo(
    () => project?.workstreams.flatMap((w) => w.milestones.map((m) => ({ ws: w, m }))) ?? [],
    [project],
  );
  const reviewTarget = useMemo(() => allMilestones.find((x) => x.m.id === reviewId) ?? null, [allMilestones, reviewId]);

  async function act<T>(fn: () => Promise<T>, okMessage?: string): Promise<T | undefined> {
    setBusy(true);
    try {
      const result = await fn();
      if (okMessage) toast({ title: okMessage });
      await load();
      return result;
    } catch (error) {
      toast({
        title: "Belum berhasil",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(link: ProjectPicLinkDto) {
    const url = absoluteUrl(link.path);
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link disalin", description: url });
    } catch {
      window.prompt("Salin link PIC:", url);
    }
  }

  async function openWorkload(staffId: string | null) {
    if (!staffId) return;
    try {
      setWorkload(await apiCall<ProjectPicWorkloadDto>(`/api/projects/pic/${encodeURIComponent(staffId)}`));
    } catch (error) {
      toast({ title: "Gagal memuat", description: error instanceof Error ? error.message : "", variant: "destructive" });
    }
  }

  if (loading) {
    return (
      <AdminPage title="Project" backHref="/projects" maxWidth="3xl">
        <p className="p-8 text-center text-sm text-muted-foreground">Memuat project…</p>
      </AdminPage>
    );
  }
  if (!project) {
    return (
      <AdminPage title="Project" backHref="/projects" maxWidth="3xl">
        <p className="p-8 text-center text-sm text-muted-foreground">Project tidak ditemukan.</p>
      </AdminPage>
    );
  }

  const published = project.setup_status === "PUBLISHED";
  const wsWarn = weightWarning(project.workstreams);
  const waiting = allMilestones.filter((x) => x.m.status === "WAITING_VALIDATION");
  const revisions = allMilestones.filter((x) => x.m.status === "REVISION");
  const deadlineSt = deadlineState(project.deadline, todayKey, project.health_derived === "COMPLETED");

  const checklist: { label: string; ok: boolean }[] = [
    { label: "Nama project", ok: true },
    { label: "Goal / Definition of Done", ok: Boolean(project.goal) },
    { label: "PIC utama", ok: !project.readiness.missing.includes("PIC_REQUIRED") },
    { label: "Deadline", ok: Boolean(project.deadline) },
    { label: "Bagian kerja (workstream)", ok: project.workstream_count > 0 },
    { label: "Milestone", ok: project.workstream_count > 0 && !project.readiness.missing.includes("MILESTONE_REQUIRED") && project.milestone_total > 0 },
    { label: "Checklist langkah", ok: project.milestone_total > 0 && !project.readiness.missing.includes("CHECKLIST_REQUIRED") },
  ];

  return (
    <AdminPage title="Project" backHref="/projects" maxWidth="3xl">
      {/* Header */}
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight">{project.name}</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {PROJECT_STATUS_LABEL[project.status]} · dibuat {project.created_by || "owner"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {published ? (
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", healthBadgeClass(project.health_derived))}>
                  {HEALTH_LABEL[project.health_derived]}
                </span>
              ) : (
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800">
                  {project.setup_status === "READY" ? "Siap dibagikan" : "Sedang disiapkan"}
                </span>
              )}
              <Button
                size="icon"
                variant="outline"
                aria-label="Duplikat project"
                disabled={busy}
                onClick={async () => {
                  if (!window.confirm("Duplikat struktur project ini? PIC, bukti, dan progress tidak ikut disalin.")) return;
                  const copy = await act(() => apiCall<ProjectDetailDto>(`/api/projects/${projectId}/duplicate`, { method: "POST", body: JSON.stringify({}) }), "Project diduplikasi");
                  if (copy) router.push(`/projects/${copy.id}`);
                }}
              >
                <CopyPlus className="size-4" />
              </Button>
              <Button size="icon" variant="outline" aria-label="Edit project" onClick={() => setEditProject(true)}>
                <Pencil className="size-4" />
              </Button>
            </div>
          </div>

          {project.goal ? (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Goal / Definition of Done</p>
              <p className="mt-1 text-sm">{project.goal}</p>
            </div>
          ) : null}

          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">
                Progress dari milestone yang disetujui · {project.milestone_done}/{project.milestone_total}
              </span>
              <strong className="text-lg">{project.progress}%</strong>
            </div>
            <Progress value={project.progress} />
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">PIC utama</p>
              {project.lead_staff_id ? (
                <button type="button" className="font-semibold underline-offset-2 hover:underline" onClick={() => openWorkload(project.lead_staff_id)}>
                  {project.lead_name}
                </button>
              ) : (
                <p className="font-semibold text-amber-700">Belum dipilih</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Deadline</p>
              <p className={cn("font-semibold", deadlineSt === "overdue" && "text-red-700", deadlineSt === "soon" && "text-amber-700")}>
                {formatDeadline(project.deadline)}
                {deadlineSt === "overdue" ? " · terlambat" : ""}
              </p>
            </div>
          </div>

          {published && project.focus_text ? (
            <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Fokus berikutnya </span>
              {project.focus_text}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Setup / publish gate */}
      {!published ? (
        <Card className="border-violet-300">
          <CardContent className="space-y-4 p-4">
            <div>
              <h2 className="font-bold">Kesiapan project</h2>
              <p className="text-sm text-muted-foreground">
                Link PIC baru bisa dibagikan setelah ada PIC, bagian kerja, milestone, dan checklist langkah.
              </p>
            </div>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-sm">
                  {item.ok ? <CheckCircle2 className="size-4 text-emerald-600" /> : <Circle className="size-4 text-muted-foreground" />}
                  <span className={item.ok ? "" : "text-muted-foreground"}>{item.label}</span>
                </li>
              ))}
            </ul>

            {project.workstream_count === 0 && project.lead_staff_id ? (
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-sm font-medium">Project ini dikerjakan satu PIC saja?</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      act(
                        () => apiCall(`/api/projects/${projectId}/workstreams`, { method: "POST", body: JSON.stringify({ simple: true }) }),
                        `Bagian “Eksekusi Utama” dibuat untuk ${project.lead_name}`,
                      )
                    }
                  >
                    Ya, {project.lead_name} mengerjakan semuanya
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setWsDialog({ open: true, ws: null })}>
                    Tidak, tambah beberapa bagian
                  </Button>
                </div>
              </div>
            ) : null}

            {!project.readiness.ready ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                <p className="font-semibold">Belum siap dibagikan. Yang perlu dilengkapi:</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {project.readiness.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Button
              className="w-full"
              disabled={busy || !project.readiness.ready}
              onClick={() =>
                act(
                  () => apiCall(`/api/projects/${projectId}/publish`, { method: "POST" }),
                  "Project dibagikan. Link PIC sudah dibuat.",
                )
              }
            >
              <Send className="mr-2 size-4" />
              Bagikan ke PIC
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Butuh keputusan */}
      {waiting.length || revisions.length || project.blockers.length ? (
        <section className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Perlu tindakan</h2>
          {waiting.map(({ ws, m }) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setReviewId(m.id)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border-2 border-sky-300 bg-sky-50 p-3 text-left"
            >
              <span className="min-w-0">
                <span className="block text-xs text-muted-foreground">{ws.name} · menunggu validasi</span>
                <span className="block font-semibold leading-snug">{m.title}</span>
                <span className="block text-xs text-muted-foreground">
                  Diajukan {m.reviews.find((r) => r.status === "PENDING")?.submitted_by_name} ·{" "}
                  {formatStamp(m.reviews.find((r) => r.status === "PENDING")?.submitted_at ?? null)}
                </span>
              </span>
              <span className="shrink-0 text-sm font-bold text-sky-800">Review</span>
            </button>
          ))}
          {revisions.map(({ ws, m }) => (
            <div key={m.id} className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
              <p className="text-xs text-muted-foreground">{ws.name} · menunggu perbaikan PIC</p>
              <p className="font-semibold">{m.title}</p>
              {m.latest_review?.review_note ? <p className="mt-1 text-red-900">Catatan: {m.latest_review.review_note}</p> : null}
            </div>
          ))}
          {project.blockers.map((b) => (
            <div key={b.id} className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-700" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">
                  Kendala · {b.workstream_name}
                  {b.milestone_title ? ` › ${b.milestone_title}` : ""} · {b.reported_by_name}, {formatStamp(b.created_at)}
                </p>
                <p className="font-medium">{b.text}</p>
              </div>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => apiCall(`/api/projects/blockers/${b.id}`, { method: "POST" }), "Kendala ditandai selesai")}>
                Selesai
              </Button>
            </div>
          ))}
        </section>
      ) : null}

      {/* Bagian kerja */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Bagian kerja</h2>
          <Button size="sm" variant="outline" onClick={() => setWsDialog({ open: true, ws: null })}>
            <Plus className="mr-1 size-4" /> Bagian
          </Button>
        </div>
        {wsWarn.warn || project.weight_warning ? (
          <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900">
            Bobot khusus dipakai tetapi totalnya bukan 100. Progress tetap dihitung proporsional.
          </p>
        ) : null}

        {project.workstreams.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">Belum ada bagian kerja.</CardContent>
          </Card>
        ) : null}

        {project.workstreams.map((ws) => {
          const done = ws.milestones.filter((m) => m.status === "DONE").length;
          const wait = ws.milestones.filter((m) => m.status === "WAITING_VALIDATION").length;
          const msWarn = weightWarning(ws.milestones);
          const picName = ws.owner_name || project.lead_name;
          const picId = ws.owner_staff_id || project.lead_staff_id;
          return (
            <Card key={ws.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold leading-tight">{ws.name}</p>
                    <p className="text-xs text-muted-foreground">
                      PIC:{" "}
                      {picId ? (
                        <button type="button" className="font-medium text-foreground underline-offset-2 hover:underline" onClick={() => openWorkload(picId)}>
                          {picName}
                        </button>
                      ) : (
                        <span className="text-amber-700">belum dipilih</span>
                      )}
                      {!ws.owner_staff_id && project.lead_name ? " (PIC utama)" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <strong className="mr-1 text-lg">{ws.progress}%</strong>
                    <Button size="icon" variant="ghost" aria-label="Edit bagian" onClick={() => setWsDialog({ open: true, ws })}>
                      <Pencil className="size-4" />
                    </Button>
                    {ws.milestones.length === 0 ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Hapus bagian"
                        className="text-destructive"
                        onClick={() => {
                          if (window.confirm(`Hapus bagian “${ws.name}”?`)) {
                            void act(() => apiCall(`/api/projects/workstreams/${ws.id}`, { method: "DELETE" }), "Bagian dihapus");
                          }
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
                <Progress value={ws.progress} />
                <p className="text-xs text-muted-foreground">
                  {done}/{ws.milestones.length} milestone disetujui
                  {ws.deadline ? ` · deadline ${formatDeadline(ws.deadline)}` : ""}
                  {wait ? ` · ${wait} menunggu validasi` : ""}
                </p>
                {msWarn.warn ? (
                  <p className="text-xs text-amber-800">Bobot milestone bagian ini totalnya {msWarn.total}, bukan 100.</p>
                ) : null}

                <div className="space-y-2">
                  {ws.milestones.map((m) => (
                    <MilestoneCard
                      key={m.id}
                      milestone={m}
                      todayKey={todayKey}
                      onChanged={load}
                      onReview={(x) => setReviewId(x.id)}
                      onEdit={(x) => setMsDialog({ open: true, wsId: ws.id, ms: x })}
                    />
                  ))}
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={() => setMsDialog({ open: true, wsId: ws.id, ms: null })}>
                  <Plus className="mr-1 size-4" /> Milestone
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* Link PIC */}
      {published ? (
        <section className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Link PIC</h2>
          <Card>
            <CardContent className="divide-y p-0">
              {links.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Belum ada link aktif.</p> : null}
              {links.map((link) => (
                <div key={link.id} className="space-y-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{link.staff_name}</p>
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <Link2 className="size-3" /> {absoluteUrl(link.path)}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => copyLink(link)}>
                      <Copy className="mr-1 size-4" /> Salin
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`Buat link baru untuk ${link.staff_name}? Link lama langsung tidak berlaku.`)) {
                          void act(
                            () => apiCall(`/api/projects/${projectId}/pic-links`, { method: "POST", body: JSON.stringify({ staff_id: link.staff_id, rotate: true }) }),
                            "Link baru dibuat",
                          );
                        }
                      }}
                    >
                      <RefreshCw className="mr-1 size-4" /> Link baru
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`Nonaktifkan link ${link.staff_name}? Progress dan riwayat tidak berubah.`)) {
                          void act(
                            () => apiCall(`/api/projects/${projectId}/pic-links`, { method: "DELETE", body: JSON.stringify({ staff_id: link.staff_id }) }),
                            "Link dinonaktifkan",
                          );
                        }
                      }}
                    >
                      <ShieldOff className="mr-1 size-4" /> Nonaktifkan
                    </Button>
                  </div>
                </div>
              ))}
              {/* PIC tanpa link aktif (mis. baru ditambahkan / sudah dicabut) */}
              {[
                ...new Map(
                  [
                    ...(project.lead_staff_id ? [[project.lead_staff_id, project.lead_name || "PIC"] as const] : []),
                    ...project.workstreams
                      .filter((w) => w.owner_staff_id)
                      .map((w) => [w.owner_staff_id as string, w.owner_name || "PIC"] as const),
                  ],
                ),
              ]
                .filter(([id]) => !links.some((l) => l.staff_id === id))
                .map(([id, name]) => (
                  <div key={id} className="flex items-center justify-between gap-2 p-3">
                    <p className="text-sm">
                      <strong>{name}</strong> <span className="text-muted-foreground">belum punya link aktif</span>
                    </p>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => apiCall(`/api/projects/${projectId}/pic-links`, { method: "POST", body: JSON.stringify({ staff_id: id }) }), "Link dibuat")}>
                      Buat link
                    </Button>
                  </div>
                ))}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {/* Task terkait */}
      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Task terkait</h2>
        <Card>
          <CardContent className="space-y-3 p-3">
            {tasks.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada task yang dihubungkan. Task rutin tidak wajib masuk project.</p> : null}
            {tasks.map((t) => (
              <div key={t.link_id} className="flex items-start justify-between gap-2 rounded-md bg-muted/40 p-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium leading-snug">{t.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.task_id} · {t.status}
                    {t.staff_name ? ` · ${t.staff_name}` : ""}
                    {t.milestone_id ? ` · ${allMilestones.find((x) => x.m.id === t.milestone_id)?.m.title ?? ""}` : ""}
                  </p>
                </div>
                <Button size="icon" variant="ghost" aria-label="Lepas task" disabled={busy} onClick={() => act(() => apiCall(`/api/projects/${projectId}/tasks`, { method: "DELETE", body: JSON.stringify({ link_id: t.link_id }) }), "Task dilepas")}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input
                className="h-9 rounded-md border bg-background px-3 text-sm"
                placeholder="ID task, mis. TSK-2026…"
                value={taskInput.task_id}
                onChange={(e) => setTaskInput({ ...taskInput, task_id: e.target.value })}
              />
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={taskInput.milestone_id}
                onChange={(e) => setTaskInput({ ...taskInput, milestone_id: e.target.value })}
              >
                <option value="">Tanpa milestone</option>
                {allMilestones.map(({ ws, m }) => (
                  <option key={m.id} value={m.id}>
                    {ws.name} › {m.title}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                disabled={busy || !taskInput.task_id.trim()}
                onClick={async () => {
                  const done = await act(() => apiCall(`/api/projects/${projectId}/tasks`, { method: "POST", body: JSON.stringify(taskInput) }), "Task dihubungkan");
                  if (done !== undefined) setTaskInput({ task_id: "", milestone_id: "" });
                }}
              >
                Hubungkan
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Riwayat */}
      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Riwayat otomatis</h2>
        <Card>
          <CardContent className="p-0">
            {project.activity.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Belum ada aktivitas.</p>
            ) : (
              <>
                <ol className="divide-y">
                  {project.activity.slice(0, 8).map((a) => (
                    <li key={a.id} className="px-4 py-2.5">
                      <p className="text-[11px] text-muted-foreground">{formatStamp(a.created_at)}</p>
                      <p className="text-sm leading-snug">{a.message}</p>
                    </li>
                  ))}
                </ol>
                {project.activity.length > 8 ? (
                  <details className="border-t">
                    <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-primary">
                      Lihat {project.activity.length - 8} aktivitas lainnya
                    </summary>
                    <ol className="divide-y border-t">
                      {project.activity.slice(8).map((a) => (
                        <li key={a.id} className="px-4 py-2.5">
                          <p className="text-[11px] text-muted-foreground">{formatStamp(a.created_at)}</p>
                          <p className="text-sm leading-snug">{a.message}</p>
                        </li>
                      ))}
                    </ol>
                  </details>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <EditProjectDialog
        open={editProject}
        project={project}
        staff={staff}
        saving={busy}
        onClose={() => setEditProject(false)}
        onSave={async (patch) => {
          const done = await act(() => apiCall(`/api/projects/${projectId}`, { method: "PATCH", body: JSON.stringify(patch) }), "Project diperbarui");
          if (done !== undefined) setEditProject(false);
        }}
      />

      <WorkstreamDialog
        open={wsDialog.open}
        workstream={wsDialog.ws}
        staff={staff}
        saving={busy}
        onClose={() => setWsDialog({ open: false, ws: null })}
        onSave={async (v) => {
          const url = wsDialog.ws ? `/api/projects/workstreams/${wsDialog.ws.id}` : `/api/projects/${projectId}/workstreams`;
          const done = await act(() => apiCall(url, { method: wsDialog.ws ? "PATCH" : "POST", body: JSON.stringify(v) }), "Bagian kerja disimpan");
          if (done !== undefined) setWsDialog({ open: false, ws: null });
        }}
      />

      <MilestoneDialog
        open={msDialog.open}
        milestone={msDialog.ms}
        saving={busy}
        onClose={() => setMsDialog({ open: false, wsId: "", ms: null })}
        onSave={async (v) => {
          const done = await act(
            () =>
              msDialog.ms
                ? apiCall(`/api/projects/milestones/${msDialog.ms.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ title: v.title, description: v.description, weight: v.weight, deadline: v.deadline }),
                  })
                : apiCall(`/api/projects/workstreams/${msDialog.wsId}/milestones`, { method: "POST", body: JSON.stringify(v) }),
            "Milestone disimpan",
          );
          if (done !== undefined) setMsDialog({ open: false, wsId: "", ms: null });
        }}
      />

      <ReviewDialog
        milestone={reviewTarget?.m ?? null}
        context={reviewTarget ? `${project.name} · ${reviewTarget.ws.name}` : ""}
        saving={busy}
        onClose={() => setReviewId(null)}
        onDecide={async (decision, note) => {
          if (!reviewTarget) return;
          const done = await act(
            () =>
              apiCall(`/api/projects/milestones/${reviewTarget.m.id}/review`, {
                method: "POST",
                body: JSON.stringify({ decision, note }),
              }),
            decision === "APPROVED" ? "Milestone disetujui" : "Revisi dikirim ke PIC",
          );
          if (done !== undefined) setReviewId(null);
        }}
      />

      <PicWorkloadDialog data={workload} onClose={() => setWorkload(null)} />
    </AdminPage>
  );
}

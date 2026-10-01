"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  CircleDot,
  Clock3,
  Copy,
  Link2,
  Plus,
  Save,
  Trash2,
  XCircle,
} from "lucide-react";
import { AdminPage } from "@/components/admin-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type {
  MilestoneStatus,
  ProjectDetailDto,
  ProjectHealth,
  ProjectMilestoneDto,
  ProjectPicLinkDto,
  ProjectStaffOption,
  ProjectWorkstreamDto,
} from "@/lib/project-types";

type ApiResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

const HEALTH_OPTIONS: { value: ProjectHealth; label: string }[] = [
  { value: "ON_TRACK", label: "On Track" },
  { value: "NEED_ATTENTION", label: "Perlu Perhatian" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "COMPLETED", label: "Selesai" },
];

const MILESTONE_LABEL: Record<MilestoneStatus, string> = {
  NOT_STARTED: "Belum Mulai",
  IN_PROGRESS: "Berjalan",
  WAITING_VALIDATION: "Menunggu Validasi",
  REVISION: "Perlu Revisi",
  DONE: "Disetujui",
  BLOCKED: "Blocked",
};

function milestoneIcon(status: MilestoneStatus) {
  if (status === "DONE") {
    return <CheckCircle2 className="size-4 text-emerald-600" />;
  }
  if (status === "WAITING_VALIDATION") {
    return <Clock3 className="size-4 text-sky-600" />;
  }
  if (status === "REVISION" || status === "BLOCKED") {
    return <AlertTriangle className="size-4 text-destructive" />;
  }
  if (status === "IN_PROGRESS") {
    return <CircleDot className="size-4 text-amber-600" />;
  }
  return <Circle className="size-4 text-muted-foreground" />;
}

function milestoneStatusClass(status: MilestoneStatus) {
  if (status === "DONE") return "bg-emerald-100 text-emerald-800";
  if (status === "WAITING_VALIDATION") return "bg-sky-100 text-sky-800";
  if (status === "REVISION" || status === "BLOCKED")
    return "bg-red-100 text-red-800";
  if (status === "IN_PROGRESS") return "bg-amber-100 text-amber-800";
  return "bg-muted text-muted-foreground";
}

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = String(params.projectId);
  const { toast } = useToast();

  const [project, setProject] = useState<ProjectDetailDto | null>(null);
  const [staff, setStaff] = useState<ProjectStaffOption[]>([]);
  const [picLinks, setPicLinks] = useState<ProjectPicLinkDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [projectDraft, setProjectDraft] = useState({
    lead_staff_id: "",
    health: "ON_TRACK" as ProjectHealth,
    next_action: "",
    blocker: "",
    deadline: "",
  });

  const [workstreamDrafts, setWorkstreamDrafts] = useState<
    Record<
      string,
      {
        owner_staff_id: string;
        health: ProjectHealth;
        next_action: string;
        blocker: string;
        deadline: string;
      }
    >
  >({});

  const [newWorkstream, setNewWorkstream] = useState({
    name: "",
    owner_staff_id: "",
    next_action: "",
    deadline: "",
  });

  const [milestoneDrafts, setMilestoneDrafts] = useState<
    Record<string, { title: string; deadline: string }>
  >({});

  const [stepDrafts, setStepDrafts] = useState<
    Record<
      string,
      {
        item_text: string;
        is_required: boolean;
        requires_evidence: boolean;
      }
    >
  >({});

  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [projectRes, staffRes, linksRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`, { cache: "no-store" }),
        fetch("/api/projects/staff-options", { cache: "no-store" }),
        fetch(`/api/projects/${projectId}/pic-links`, { cache: "no-store" }),
      ]);

      const projectJson = (await projectRes.json()) as ApiResponse<ProjectDetailDto>;
      const staffJson = (await staffRes.json()) as ApiResponse<ProjectStaffOption[]>;
      const linksJson = (await linksRes.json()) as ApiResponse<ProjectPicLinkDto[]>;

      if (!projectJson.success) throw new Error(projectJson.error);

      const data = projectJson.data;
      setProject(data);
      setProjectDraft({
        lead_staff_id: data.lead_staff_id || "",
        health: data.health,
        next_action: data.next_action || "",
        blocker: data.blocker || "",
        deadline: data.deadline || "",
      });

      const drafts: typeof workstreamDrafts = {};
      for (const workstream of data.workstreams) {
        drafts[workstream.id] = {
          owner_staff_id: workstream.owner_staff_id || "",
          health: workstream.health,
          next_action: workstream.next_action || "",
          blocker: workstream.blocker || "",
          deadline: workstream.deadline || "",
        };
      }
      setWorkstreamDrafts(drafts);

      if (staffJson.success) setStaff(staffJson.data);
      if (linksJson.success) setPicLinks(linksJson.data);
    } catch (error) {
      toast({
        title: "Gagal memuat project",
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

  const linksByStaff = useMemo(
    () => new Map(picLinks.map((link) => [link.staff_id, link])),
    [picLinks],
  );

  async function saveProject() {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...projectDraft,
          lead_staff_id: projectDraft.lead_staff_id || null,
          deadline: projectDraft.deadline || null,
        }),
      });
      const json = (await response.json()) as ApiResponse<ProjectDetailDto>;
      if (!json.success) throw new Error(json.error);
      toast({ title: "Project diperbarui" });
      await load();
    } catch (error) {
      toast({
        title: "Gagal menyimpan project",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  }

  async function saveWorkstream(workstream: ProjectWorkstreamDto) {
    const draft = workstreamDrafts[workstream.id];
    if (!draft) return;
    try {
      const response = await fetch(`/api/projects/workstreams/${workstream.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          owner_staff_id: draft.owner_staff_id || null,
          deadline: draft.deadline || null,
        }),
      });
      const json = (await response.json()) as ApiResponse<{ updated: true }>;
      if (!json.success) throw new Error(json.error);
      toast({ title: `${workstream.name} diperbarui` });
      await load();
    } catch (error) {
      toast({
        title: "Gagal menyimpan workstream",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  }

  async function createOrCopyPicLink(staffId: string) {
    const existing = linksByStaff.get(staffId);
    if (existing) {
      await copyPicLink(existing);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/pic-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: staffId }),
      });
      const json = (await response.json()) as ApiResponse<ProjectPicLinkDto>;
      if (!json.success) throw new Error(json.error);
      await copyPicLink(json.data);
      await load();
    } catch (error) {
      toast({
        title: "Gagal membuat link PIC",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  }

  async function copyPicLink(link: ProjectPicLinkDto) {
    const absolute =
      typeof window === "undefined"
        ? link.path
        : `${window.location.origin}${link.path}`;
    await navigator.clipboard.writeText(absolute);
    toast({
      title: "Link PIC disalin",
      description: absolute,
    });
  }

  async function addWorkstream() {
    if (!newWorkstream.name.trim()) return;
    try {
      const response = await fetch(`/api/projects/${projectId}/workstreams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newWorkstream,
          owner_staff_id: newWorkstream.owner_staff_id || null,
          deadline: newWorkstream.deadline || null,
        }),
      });
      const json = (await response.json()) as ApiResponse<{ created: true }>;
      if (!json.success) throw new Error(json.error);
      setNewWorkstream({
        name: "",
        owner_staff_id: "",
        next_action: "",
        deadline: "",
      });
      await load();
    } catch (error) {
      toast({
        title: "Gagal menambah workstream",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  }

  async function addMilestone(workstreamId: string) {
    const draft = milestoneDrafts[workstreamId] || { title: "", deadline: "" };
    if (!draft.title.trim()) return;

    try {
      const response = await fetch(
        `/api/projects/workstreams/${workstreamId}/milestones`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: draft.title,
            deadline: draft.deadline || null,
          }),
        },
      );
      const json = (await response.json()) as ApiResponse<{ created: true }>;
      if (!json.success) throw new Error(json.error);
      setMilestoneDrafts((current) => ({
        ...current,
        [workstreamId]: { title: "", deadline: "" },
      }));
      await load();
    } catch (error) {
      toast({
        title: "Gagal menambah milestone",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  }

  async function addStep(milestoneId: string) {
    const draft = stepDrafts[milestoneId] || {
      item_text: "",
      is_required: true,
      requires_evidence: false,
    };
    if (!draft.item_text.trim()) return;

    try {
      const response = await fetch(
        `/api/projects/milestones/${milestoneId}/steps`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        },
      );
      const json = (await response.json()) as ApiResponse<unknown>;
      if (!json.success) throw new Error(json.error);
      setStepDrafts((current) => ({
        ...current,
        [milestoneId]: {
          item_text: "",
          is_required: true,
          requires_evidence: false,
        },
      }));
      await load();
    } catch (error) {
      toast({
        title: "Gagal menambah checklist",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  }

  async function deleteStep(stepId: string) {
    try {
      const response = await fetch(`/api/projects/milestone-steps/${stepId}`, {
        method: "DELETE",
      });
      const json = (await response.json()) as ApiResponse<unknown>;
      if (!json.success) throw new Error(json.error);
      await load();
    } catch (error) {
      toast({
        title: "Gagal menghapus langkah",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  }

  async function reviewMilestone(
    milestone: ProjectMilestoneDto,
    decision: "APPROVED" | "REVISION",
  ) {
    const note = reviewNotes[milestone.id] || "";
    try {
      const response = await fetch(
        `/api/projects/milestones/${milestone.id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision, note }),
        },
      );
      const json = (await response.json()) as ApiResponse<unknown>;
      if (!json.success) throw new Error(json.error);
      setReviewNotes((current) => ({ ...current, [milestone.id]: "" }));
      toast({
        title:
          decision === "APPROVED"
            ? "Milestone disetujui"
            : "Revisi dikirim ke PIC",
      });
      await load();
    } catch (error) {
      toast({
        title: "Validasi gagal",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  }

  if (loading && !project) {
    return (
      <AdminPage title="Project" backHref="/projects" maxWidth="3xl">
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Memuat…
          </CardContent>
        </Card>
      </AdminPage>
    );
  }

  if (!project) {
    return (
      <AdminPage title="Project" backHref="/projects" maxWidth="3xl">
        <Card>
          <CardContent className="p-8 text-center">Project tidak ditemukan.</CardContent>
        </Card>
      </AdminPage>
    );
  }

  const mainPicLink = project.lead_staff_id
    ? linksByStaff.get(project.lead_staff_id)
    : undefined;

  return (
    <AdminPage title={project.name} backHref="/projects" maxWidth="3xl">
      <Card>
        <CardContent className="space-y-5 p-5">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">{project.name}</h2>
                {project.goal ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    <strong>Definition of Done:</strong> {project.goal}
                  </p>
                ) : null}
              </div>
              <strong className="text-2xl">{project.progress}%</strong>
            </div>
            <Progress value={project.progress} className="mt-3" />
            <p className="mt-2 text-xs text-muted-foreground">
              Progress hanya bertambah dari milestone yang sudah divalidasi.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>PIC Utama Project</Label>
              <Select
                value={projectDraft.lead_staff_id || "NONE"}
                onValueChange={(value) =>
                  setProjectDraft({
                    ...projectDraft,
                    lead_staff_id: value === "NONE" ? "" : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih PIC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Belum ditentukan</SelectItem>
                  {staff.map((item) => (
                    <SelectItem key={item.staff_id} value={item.staff_id}>
                      {item.name}
                      {item.position ? ` · ${item.position}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {project.lead_staff_id ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void createOrCopyPicLink(project.lead_staff_id as string)
                  }
                >
                  {mainPicLink ? (
                    <Copy className="mr-2 size-4" />
                  ) : (
                    <Link2 className="mr-2 size-4" />
                  )}
                  {mainPicLink ? "Salin Link PIC Utama" : "Buat Link PIC Utama"}
                </Button>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Kondisi project</Label>
              <Select
                value={projectDraft.health}
                onValueChange={(value) =>
                  setProjectDraft({
                    ...projectDraft,
                    health: value as ProjectHealth,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HEALTH_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Next action project</Label>
              <Textarea
                value={projectDraft.next_action}
                onChange={(event) =>
                  setProjectDraft({
                    ...projectDraft,
                    next_action: event.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Blocker</Label>
              <Textarea
                value={projectDraft.blocker}
                onChange={(event) =>
                  setProjectDraft({
                    ...projectDraft,
                    blocker: event.target.value,
                  })
                }
                placeholder="Kosongkan bila tidak ada hambatan"
              />
            </div>

            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input
                type="date"
                value={projectDraft.deadline}
                onChange={(event) =>
                  setProjectDraft({
                    ...projectDraft,
                    deadline: event.target.value,
                  })
                }
              />
            </div>

            <div className="flex items-end justify-end">
              <Button onClick={saveProject}>
                <Save className="mr-2 size-4" />
                Simpan Project
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-semibold">Workstream & Eksekusi</h3>
        <p className="text-sm text-muted-foreground">
          Pecah project menjadi bidang kerja. Setiap PIC mendapat link pribadi
          untuk mengerjakan checklist dan mengajukan validasi.
        </p>
      </div>

      {project.workstreams.map((workstream) => {
        const draft = workstreamDrafts[workstream.id] || {
          owner_staff_id: workstream.owner_staff_id || "",
          health: workstream.health,
          next_action: workstream.next_action || "",
          blocker: workstream.blocker || "",
          deadline: workstream.deadline || "",
        };
        const milestoneDraft = milestoneDrafts[workstream.id] || {
          title: "",
          deadline: "",
        };
        const workstreamLink = workstream.owner_staff_id
          ? linksByStaff.get(workstream.owner_staff_id)
          : undefined;

        return (
          <Card key={workstream.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{workstream.name}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {
                      workstream.milestones.filter(
                        (item) => item.status === "DONE",
                      ).length
                    }
                    /{workstream.milestones.length} milestone disetujui
                  </p>
                </div>
                <strong>{workstream.progress}%</strong>
              </div>
              <Progress value={workstream.progress} />
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>PIC Workstream</Label>
                  <Select
                    value={draft.owner_staff_id || "NONE"}
                    onValueChange={(value) =>
                      setWorkstreamDrafts((current) => ({
                        ...current,
                        [workstream.id]: {
                          ...draft,
                          owner_staff_id: value === "NONE" ? "" : value,
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih PIC" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Belum ditentukan</SelectItem>
                      {staff.map((item) => (
                        <SelectItem key={item.staff_id} value={item.staff_id}>
                          {item.name}
                          {item.position ? ` · ${item.position}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {workstream.owner_staff_id ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        void createOrCopyPicLink(
                          workstream.owner_staff_id as string,
                        )
                      }
                    >
                      {workstreamLink ? (
                        <Copy className="mr-2 size-4" />
                      ) : (
                        <Link2 className="mr-2 size-4" />
                      )}
                      {workstreamLink
                        ? "Salin Link Kerja PIC"
                        : "Buat Link Kerja PIC"}
                    </Button>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>Kondisi</Label>
                  <Select
                    value={draft.health}
                    onValueChange={(value) =>
                      setWorkstreamDrafts((current) => ({
                        ...current,
                        [workstream.id]: {
                          ...draft,
                          health: value as ProjectHealth,
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HEALTH_OPTIONS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Next action</Label>
                  <Input
                    value={draft.next_action}
                    onChange={(event) =>
                      setWorkstreamDrafts((current) => ({
                        ...current,
                        [workstream.id]: {
                          ...draft,
                          next_action: event.target.value,
                        },
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Blocker</Label>
                  <Input
                    value={draft.blocker}
                    onChange={(event) =>
                      setWorkstreamDrafts((current) => ({
                        ...current,
                        [workstream.id]: {
                          ...draft,
                          blocker: event.target.value,
                        },
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Deadline</Label>
                  <Input
                    type="date"
                    value={draft.deadline}
                    onChange={(event) =>
                      setWorkstreamDrafts((current) => ({
                        ...current,
                        [workstream.id]: {
                          ...draft,
                          deadline: event.target.value,
                        },
                      }))
                    }
                  />
                </div>

                <div className="flex items-end justify-end">
                  <Button
                    variant="outline"
                    onClick={() => void saveWorkstream(workstream)}
                  >
                    <Save className="mr-2 size-4" />
                    Simpan Workstream
                  </Button>
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <div>
                  <p className="font-medium">Milestone & Checklist Validasi</p>
                  <p className="text-xs text-muted-foreground">
                    PIC menyelesaikan langkah di bawah. Milestone baru masuk
                    progress setelah kamu setujui.
                  </p>
                </div>

                {workstream.milestones.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Belum ada milestone.
                  </div>
                ) : null}

                {workstream.milestones.map((milestone, index) => {
                  const stepDraft = stepDrafts[milestone.id] || {
                    item_text: "",
                    is_required: true,
                    requires_evidence: false,
                  };
                  const locked =
                    milestone.status === "WAITING_VALIDATION" ||
                    milestone.status === "DONE";

                  return (
                    <section
                      key={milestone.id}
                      className="rounded-xl border bg-muted/10 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 gap-2">
                          <span className="mt-0.5">
                            {milestoneIcon(milestone.status)}
                          </span>
                          <div>
                            <p className="font-semibold">
                              {index + 1}. {milestone.title}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {milestone.deadline
                                ? `Deadline ${milestone.deadline}`
                                : "Tanpa deadline"}{" "}
                              · {milestone.steps.filter((s) => s.is_checked).length}/
                              {milestone.steps.length} langkah selesai
                            </p>
                          </div>
                        </div>

                        <span
                          className={`w-fit rounded-full px-2 py-1 text-[11px] font-bold ${milestoneStatusClass(
                            milestone.status,
                          )}`}
                        >
                          {MILESTONE_LABEL[milestone.status]}
                        </span>
                      </div>

                      {milestone.status === "WAITING_VALIDATION" ? (
                        <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3">
                          <p className="font-semibold text-sky-950">
                            Menunggu validasi
                          </p>
                          <p className="mt-1 text-xs text-sky-800">
                            Diajukan oleh{" "}
                            {milestone.latest_review?.submitted_by_name || "PIC"}
                            {milestone.latest_review?.submitted_at
                              ? ` · ${new Date(
                                  milestone.latest_review.submitted_at,
                                ).toLocaleString("id-ID")}`
                              : ""}
                          </p>

                          <Textarea
                            className="mt-3 bg-white"
                            value={reviewNotes[milestone.id] || ""}
                            onChange={(event) =>
                              setReviewNotes((current) => ({
                                ...current,
                                [milestone.id]: event.target.value,
                              }))
                            }
                            placeholder="Catatan validasi. Wajib jika minta revisi."
                          />

                          <div className="mt-3 flex flex-wrap justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() =>
                                void reviewMilestone(milestone, "REVISION")
                              }
                            >
                              <XCircle className="mr-2 size-4" />
                              Minta Revisi
                            </Button>
                            <Button
                              onClick={() =>
                                void reviewMilestone(milestone, "APPROVED")
                              }
                            >
                              <CheckCircle2 className="mr-2 size-4" />
                              Setujui
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      {milestone.status === "REVISION" &&
                      milestone.latest_review?.review_note ? (
                        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                          <strong>Catatan revisi:</strong>{" "}
                          {milestone.latest_review.review_note}
                        </div>
                      ) : null}

                      {milestone.status === "DONE" ? (
                        <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
                          <strong>Disetujui.</strong> Milestone ini sudah dihitung
                          ke progress project.
                        </div>
                      ) : null}

                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          Checklist langkah
                        </p>

                        {milestone.steps.length === 0 ? (
                          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                            Belum ada langkah. Tambahkan urutan pekerjaan agar PIC
                            tahu persis apa yang harus dilakukan.
                          </p>
                        ) : (
                          milestone.steps.map((step, stepIndex) => (
                            <div
                              key={step.id}
                              className="flex items-start gap-3 rounded-lg border bg-background p-3"
                            >
                              {step.is_checked ? (
                                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                              ) : (
                                <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">
                                  {stepIndex + 1}. {step.item_text}
                                </p>
                                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                                  <span>
                                    {step.is_required ? "Wajib" : "Opsional"}
                                  </span>
                                  {step.requires_evidence ? (
                                    <span>· Bukti foto wajib</span>
                                  ) : null}
                                  {step.completed_at ? (
                                    <span>· selesai</span>
                                  ) : null}
                                </div>
                                {step.note ? (
                                  <p className="mt-2 rounded bg-muted/50 p-2 text-xs">
                                    Catatan PIC: {step.note}
                                  </p>
                                ) : null}
                                {step.evidence_url ? (
                                  <a
                                    href={step.evidence_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-2 inline-block text-xs font-medium text-primary underline"
                                  >
                                    Lihat bukti
                                  </a>
                                ) : null}
                              </div>
                              {!locked ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 shrink-0"
                                  onClick={() => void deleteStep(step.id)}
                                  aria-label="Hapus langkah"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              ) : null}
                            </div>
                          ))
                        )}

                        {!locked ? (
                          <div className="rounded-lg border border-dashed p-3">
                            <Input
                              value={stepDraft.item_text}
                              onChange={(event) =>
                                setStepDrafts((current) => ({
                                  ...current,
                                  [milestone.id]: {
                                    ...stepDraft,
                                    item_text: event.target.value,
                                  },
                                }))
                              }
                              placeholder="Contoh: Foto 10 SKU ikan dengan ukuran & harga"
                            />
                            <div className="mt-2 flex flex-wrap gap-4 text-sm">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={stepDraft.is_required}
                                  onChange={(event) =>
                                    setStepDrafts((current) => ({
                                      ...current,
                                      [milestone.id]: {
                                        ...stepDraft,
                                        is_required: event.target.checked,
                                      },
                                    }))
                                  }
                                />
                                Wajib
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={stepDraft.requires_evidence}
                                  onChange={(event) =>
                                    setStepDrafts((current) => ({
                                      ...current,
                                      [milestone.id]: {
                                        ...stepDraft,
                                        requires_evidence:
                                          event.target.checked,
                                      },
                                    }))
                                  }
                                />
                                Wajib bukti foto
                              </label>
                            </div>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="mt-3"
                              disabled={!stepDraft.item_text.trim()}
                              onClick={() => void addStep(milestone.id)}
                            >
                              <Plus className="mr-1 size-4" />
                              Tambah Langkah
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </section>
                  );
                })}

                <div className="grid gap-2 pt-2 sm:grid-cols-[1fr_180px_auto]">
                  <Input
                    value={milestoneDraft.title}
                    onChange={(event) =>
                      setMilestoneDrafts((current) => ({
                        ...current,
                        [workstream.id]: {
                          ...milestoneDraft,
                          title: event.target.value,
                        },
                      }))
                    }
                    placeholder="Tambah milestone…"
                  />
                  <Input
                    type="date"
                    value={milestoneDraft.deadline}
                    onChange={(event) =>
                      setMilestoneDrafts((current) => ({
                        ...current,
                        [workstream.id]: {
                          ...milestoneDraft,
                          deadline: event.target.value,
                        },
                      }))
                    }
                  />
                  <Button
                    variant="secondary"
                    onClick={() => void addMilestone(workstream.id)}
                    disabled={!milestoneDraft.title.trim()}
                  >
                    <Plus className="mr-1 size-4" />
                    Tambah
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tambah Workstream</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Nama bagian</Label>
            <Input
              value={newWorkstream.name}
              onChange={(event) =>
                setNewWorkstream({
                  ...newWorkstream,
                  name: event.target.value,
                })
              }
              placeholder="Contoh: Produk & Pakan"
            />
          </div>

          <div className="space-y-2">
            <Label>PIC Workstream</Label>
            <Select
              value={newWorkstream.owner_staff_id || "NONE"}
              onValueChange={(value) =>
                setNewWorkstream({
                  ...newWorkstream,
                  owner_staff_id: value === "NONE" ? "" : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih PIC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Belum ditentukan</SelectItem>
                {staff.map((item) => (
                  <SelectItem key={item.staff_id} value={item.staff_id}>
                    {item.name}
                    {item.position ? ` · ${item.position}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Next action</Label>
            <Input
              value={newWorkstream.next_action}
              onChange={(event) =>
                setNewWorkstream({
                  ...newWorkstream,
                  next_action: event.target.value,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Deadline</Label>
            <Input
              type="date"
              value={newWorkstream.deadline}
              onChange={(event) =>
                setNewWorkstream({
                  ...newWorkstream,
                  deadline: event.target.value,
                })
              }
            />
          </div>

          <div className="flex justify-end sm:col-span-2">
            <Button onClick={() => void addWorkstream()} disabled={!newWorkstream.name.trim()}>
              <Plus className="mr-2 size-4" />
              Tambah Workstream
            </Button>
          </div>
        </CardContent>
      </Card>
    </AdminPage>
  );
}

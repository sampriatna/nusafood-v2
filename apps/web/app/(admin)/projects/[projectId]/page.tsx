"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Circle, CircleDot, AlertTriangle, Plus, Save } from "lucide-react";
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

const MILESTONE_OPTIONS: { value: MilestoneStatus; label: string }[] = [
  { value: "NOT_STARTED", label: "Belum Mulai" },
  { value: "IN_PROGRESS", label: "Berjalan" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "DONE", label: "Selesai" },
];

function milestoneIcon(status: MilestoneStatus) {
  if (status === "DONE") return <CheckCircle2 className="size-4 text-emerald-600" />;
  if (status === "IN_PROGRESS") return <CircleDot className="size-4 text-amber-600" />;
  if (status === "BLOCKED") return <AlertTriangle className="size-4 text-destructive" />;
  return <Circle className="size-4 text-muted-foreground" />;
}

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = String(params.projectId);
  const { toast } = useToast();

  const [project, setProject] = useState<ProjectDetailDto | null>(null);
  const [staff, setStaff] = useState<ProjectStaffOption[]>([]);
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [projectRes, staffRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`, { cache: "no-store" }),
        fetch("/api/projects/staff-options", { cache: "no-store" }),
      ]);
      const projectJson = (await projectRes.json()) as ApiResponse<ProjectDetailDto>;
      const staffJson = (await staffRes.json()) as ApiResponse<ProjectStaffOption[]>;
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

  async function setMilestoneStatus(
    milestoneId: string,
    status: MilestoneStatus,
  ) {
    try {
      const response = await fetch(`/api/projects/milestones/${milestoneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = (await response.json()) as ApiResponse<{ updated: true }>;
      if (!json.success) throw new Error(json.error);
      await load();
    } catch (error) {
      toast({
        title: "Gagal mengubah milestone",
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

  return (
    <AdminPage title={project.name} backHref="/projects" maxWidth="3xl">
      <Card>
        <CardContent className="space-y-5 p-5">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">{project.name}</h2>
                {project.goal ? (
                  <p className="mt-1 text-sm text-muted-foreground">{project.goal}</p>
                ) : null}
              </div>
              <strong className="text-2xl">{project.progress}%</strong>
            </div>
            <Progress value={project.progress} className="mt-3" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Project Lead / POC utama</Label>
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
                  <SelectValue placeholder="Pilih POC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Belum ditentukan</SelectItem>
                  {staff.map((item) => (
                    <SelectItem key={item.staff_id} value={item.staff_id}>
                      {item.name}{item.position ? ` · ${item.position}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <SelectTrigger><SelectValue /></SelectTrigger>
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
        <h3 className="text-lg font-semibold">Workstream</h3>
        <p className="text-sm text-muted-foreground">
          Contoh: Ikan Hias di Dul, Produk & Pakan di Dian — masih dalam satu project.
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

        return (
          <Card key={workstream.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{workstream.name}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {workstream.milestones.filter((item) => item.status === "DONE").length}
                    /{workstream.milestones.length} milestone selesai
                  </p>
                </div>
                <strong>{workstream.progress}%</strong>
              </div>
              <Progress value={workstream.progress} />
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Owner bagian</Label>
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
                      <SelectValue placeholder="Pilih owner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Belum ditentukan</SelectItem>
                      {staff.map((item) => (
                        <SelectItem key={item.staff_id} value={item.staff_id}>
                          {item.name}{item.position ? ` · ${item.position}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                    onClick={() => saveWorkstream(workstream)}
                  >
                    <Save className="mr-2 size-4" />
                    Simpan Bagian
                  </Button>
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium">Milestone</p>

                {workstream.milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <span className="mt-0.5">{milestoneIcon(milestone.status)}</span>
                      <div>
                        <p className="text-sm font-medium">{milestone.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {milestone.deadline
                            ? `Deadline ${milestone.deadline}`
                            : "Tanpa deadline"}
                        </p>
                      </div>
                    </div>

                    <Select
                      value={milestone.status}
                      onValueChange={(value) =>
                        setMilestoneStatus(
                          milestone.id,
                          value as MilestoneStatus,
                        )
                      }
                    >
                      <SelectTrigger className="sm:w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MILESTONE_OPTIONS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}

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
                    onClick={() => addMilestone(workstream.id)}
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
            <Label>Owner bagian</Label>
            <Select
              value={newWorkstream.owner_staff_id || "NONE"}
              onValueChange={(value) =>
                setNewWorkstream({
                  ...newWorkstream,
                  owner_staff_id: value === "NONE" ? "" : value,
                })
              }
            >
              <SelectTrigger><SelectValue placeholder="Pilih owner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Belum ditentukan</SelectItem>
                {staff.map((item) => (
                  <SelectItem key={item.staff_id} value={item.staff_id}>
                    {item.name}{item.position ? ` · ${item.position}` : ""}
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
            <Button onClick={addWorkstream} disabled={!newWorkstream.name.trim()}>
              <Plus className="mr-2 size-4" />
              Tambah Workstream
            </Button>
          </div>
        </CardContent>
      </Card>
    </AdminPage>
  );
}

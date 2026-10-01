"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FolderKanban, Plus, UserRound, ChevronRight, AlertTriangle } from "lucide-react";
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
  ProjectHealth,
  ProjectStaffOption,
  ProjectSummaryDto,
} from "@/lib/project-types";

type ApiResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

const healthLabel: Record<ProjectHealth, string> = {
  ON_TRACK: "On Track",
  NEED_ATTENTION: "Perlu Perhatian",
  BLOCKED: "Blocked",
  COMPLETED: "Selesai",
};

export default function ProjectsPage() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectSummaryDto[]>([]);
  const [staff, setStaff] = useState<ProjectStaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState("");
  const [form, setForm] = useState({
    name: "",
    goal: "",
    lead_staff_id: "",
    next_action: "",
    deadline: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ownerQuery = ownerFilter
        ? `?owner=${encodeURIComponent(ownerFilter)}`
        : "";
      const [projectsRes, staffRes] = await Promise.all([
        fetch(`/api/projects${ownerQuery}`, { cache: "no-store" }),
        fetch("/api/projects/staff-options", { cache: "no-store" }),
      ]);
      const projectsJson = (await projectsRes.json()) as ApiResponse<ProjectSummaryDto[]>;
      const staffJson = (await staffRes.json()) as ApiResponse<ProjectStaffOption[]>;
      if (!projectsJson.success) throw new Error(projectsJson.error);
      setProjects(projectsJson.data);
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
  }, [ownerFilter, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createProject() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          lead_staff_id: form.lead_staff_id || null,
          deadline: form.deadline || null,
        }),
      });
      const json = (await response.json()) as ApiResponse<ProjectSummaryDto>;
      if (!json.success) throw new Error(json.error);
      setForm({
        name: "",
        goal: "",
        lead_staff_id: "",
        next_action: "",
        deadline: "",
      });
      setShowNew(false);
      await load();
    } catch (error) {
      toast({
        title: "Gagal membuat project",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPage title="Project" backHref="/dashboard" maxWidth="3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Project Berjalan</h2>
          <p className="text-sm text-muted-foreground">
            Satu project bisa punya beberapa workstream dan PIC berbeda.
          </p>
        </div>
        <Button onClick={() => setShowNew((value) => !value)}>
          <Plus className="mr-2 size-4" />
          Project
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-2 sm:grid-cols-[180px_1fr] sm:items-center">
            <Label>Filter PIC</Label>
            <Select
              value={ownerFilter || "ALL"}
              onValueChange={(value) => setOwnerFilter(value === "ALL" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua PIC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua PIC</SelectItem>
                {staff.map((item) => (
                  <SelectItem key={item.staff_id} value={item.staff_id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {showNew ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Buat Project Baru</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nama project</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Contoh: Bisnis Ikan"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Goal akhir</Label>
              <Textarea
                value={form.goal}
                onChange={(event) => setForm({ ...form, goal: event.target.value })}
                placeholder="Kapan project dianggap berhasil?"
              />
            </div>
            <div className="space-y-2">
              <Label>PIC Utama Project</Label>
              <Select
                value={form.lead_staff_id || "NONE"}
                onValueChange={(value) =>
                  setForm({
                    ...form,
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
                      {item.name}{item.position ? ` · ${item.position}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input
                type="date"
                value={form.deadline}
                onChange={(event) =>
                  setForm({ ...form, deadline: event.target.value })
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Next action pertama</Label>
              <Input
                value={form.next_action}
                onChange={(event) =>
                  setForm({ ...form, next_action: event.target.value })
                }
                placeholder="Langkah berikut yang harus langsung bergerak"
              />
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button variant="outline" onClick={() => setShowNew(false)}>
                Batal
              </Button>
              <Button
                onClick={createProject}
                disabled={saving || !form.name.trim()}
              >
                {saving ? "Menyimpan..." : "Buat Project"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Memuat project…
          </CardContent>
        </Card>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderKanban className="mx-auto mb-3 size-9 text-muted-foreground" />
            <p className="font-medium">Belum ada project</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Buat project pertama, lalu pecah menjadi workstream.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/projects/${project.id}`}
                      className="inline-flex items-center gap-1 font-semibold hover:underline"
                    >
                      <span className="truncate">{project.name}</span>
                      <ChevronRight className="size-4 shrink-0" />
                    </Link>
                    {project.goal ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {project.goal}
                      </p>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium">
                    {healthLabel[project.health]}
                  </span>
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <strong>{project.progress}%</strong>
                  </div>
                  <Progress value={project.progress} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">PIC Utama</p>
                    {project.lead_staff_id ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-medium hover:underline"
                        onClick={() => setOwnerFilter(project.lead_staff_id || "")}
                      >
                        <UserRound className="size-3.5" />
                        {project.lead_name || "PIC"}
                      </button>
                    ) : (
                      <p className="font-medium">Belum ditentukan</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Workstream</p>
                    <p className="font-medium">{project.workstream_count}</p>
                  </div>
                </div>

                {project.next_action ? (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Next Action
                    </p>
                    <p className="mt-1 text-sm">{project.next_action}</p>
                  </div>
                ) : null}

                {project.blocker ? (
                  <div className="flex gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <span>{project.blocker}</span>
                  </div>
                ) : null}

                <p className="text-xs text-muted-foreground">
                  {project.deadline ? `Deadline ${project.deadline}` : "Tanpa deadline"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminPage>
  );
}

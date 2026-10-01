"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronRight, ClipboardCheck, FolderKanban, Plus, Search } from "lucide-react";
import { AdminPage } from "@/components/admin-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  apiCall,
  formatDeadline,
  formatStamp,
  HEALTH_LABEL,
  healthBadgeClass,
} from "@/lib/project-ui";
import type {
  ProjectPendingValidationDto,
  ProjectStaffOption,
  ProjectSummaryDto,
} from "@/lib/project-types";
import { cn } from "@/lib/utils";

type Tab = "ACTIVE" | "ATTENTION" | "BLOCKED" | "ARCHIVE";

const TABS: { id: Tab; label: string }[] = [
  { id: "ACTIVE", label: "Aktif" },
  { id: "ATTENTION", label: "Perlu Perhatian" },
  { id: "BLOCKED", label: "Blocked" },
  { id: "ARCHIVE", label: "Selesai / Arsip" },
];

function isArchived(p: ProjectSummaryDto) {
  return p.status === "COMPLETED" || p.status === "CANCELLED" || p.health_derived === "COMPLETED";
}

export default function ProjectsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectSummaryDto[]>([]);
  const [pending, setPending] = useState<ProjectPendingValidationDto[]>([]);
  const [staff, setStaff] = useState<ProjectStaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("ACTIVE");
  const [query, setQuery] = useState("");
  const [picFilter, setPicFilter] = useState("ALL");
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", goal: "", lead_staff_id: "", deadline: "", start_date: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, validations, options] = await Promise.all([
        apiCall<ProjectSummaryDto[]>("/api/projects"),
        apiCall<ProjectPendingValidationDto[]>("/api/projects/validations"),
        apiCall<ProjectStaffOption[]>("/api/projects/staff-options"),
      ]);
      setProjects(list);
      setPending(validations);
      setStaff(options);
    } catch (error) {
      toast({
        title: "Gagal memuat project",
        description: error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const live = projects.filter((p) => !isArchived(p));
    return {
      active: live.length,
      attention: live.filter((p) => p.health_derived === "NEED_ATTENTION").length,
      blocked: live.filter((p) => p.health_derived === "BLOCKED").length,
      waiting: pending.length,
    };
  }, [projects, pending]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (tab === "ARCHIVE" ? !isArchived(p) : isArchived(p)) return false;
      if (tab === "ATTENTION" && p.health_derived !== "NEED_ATTENTION") return false;
      if (tab === "BLOCKED" && p.health_derived !== "BLOCKED") return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (picFilter !== "ALL") {
        const lead = p.lead_staff_id === picFilter;
        const named = staff.find((s) => s.staff_id === picFilter)?.name;
        if (!lead && !(named && p.pic_names.includes(named))) return false;
      }
      return true;
    });
  }, [projects, tab, query, picFilter, staff]);

  async function createProject() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const created = await apiCall<ProjectSummaryDto>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          goal: form.goal || null,
          lead_staff_id: form.lead_staff_id || null,
          deadline: form.deadline || null,
          start_date: form.start_date || null,
        }),
      });
      setShowNew(false);
      router.push(`/projects/${created.id}`);
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
      <div className="flex items-center justify-between gap-3">
        <div className="grid flex-1 grid-cols-4 gap-2 text-center">
          <Stat label="Aktif" value={counts.active} />
          <Stat label="Perlu Perhatian" value={counts.attention} tone={counts.attention ? "amber" : undefined} />
          <Stat label="Blocked" value={counts.blocked} tone={counts.blocked ? "red" : undefined} />
          <Stat label="Menunggu Validasi" value={counts.waiting} tone={counts.waiting ? "sky" : undefined} />
        </div>
      </div>
      <Button className="w-full sm:w-auto" onClick={() => setShowNew(true)}>
        <Plus className="mr-2 size-4" />
        Project Baru
      </Button>

      {pending.length ? (
        <section className="space-y-2 rounded-xl border-2 border-sky-300 bg-sky-50 p-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-sky-900">
            <ClipboardCheck className="size-4" />
            Menunggu Validasi ({pending.length})
          </h2>
          {pending.map((item) => (
            <Link
              key={item.milestone_id}
              href={`/projects/${item.project_id}?review=${item.milestone_id}`}
              className="block rounded-lg border border-sky-200 bg-white p-3 active:scale-[0.99]"
            >
              <p className="text-xs text-muted-foreground">
                {item.project_name} · {item.workstream_name}
              </p>
              <p className="font-semibold leading-snug">{item.milestone_title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Diajukan {item.pic_name} · {formatStamp(item.submitted_at)} · langkah {item.steps_done}/
                {item.steps_total} · {item.evidence_count} bukti
              </p>
              <span className="mt-2 inline-flex items-center text-sm font-semibold text-sky-800">
                Review <ChevronRight className="size-4" />
              </span>
            </Link>
          ))}
        </section>
      ) : null}

      <div className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-md px-3 py-2 text-sm font-medium",
              tab === t.id ? "bg-background shadow-sm" : "text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_200px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cari nama project"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={picFilter} onValueChange={setPicFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Semua PIC" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua PIC</SelectItem>
            {staff.map((s) => (
              <SelectItem key={s.staff_id} value={s.staff_id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">Memuat project…</CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderKanban className="mx-auto mb-3 size-9 text-muted-foreground" />
            <p className="font-medium">{projects.length ? "Tidak ada project di tab ini" : "Belum ada project"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {projects.length ? "Coba tab atau filter lain." : "Tekan “Project Baru”, lalu susun milestone dan checklist-nya."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Project Baru</DialogTitle>
            <DialogDescription>
              Isi yang inti dulu. Setelah dibuat, kamu menyusun bagian, milestone, dan checklist sebelum dibagikan ke PIC.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nama project</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Bisnis Ikan Hias" />
            </div>
            <div className="space-y-1.5">
              <Label>Goal / Definition of Done</Label>
              <Textarea value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="Kapan project ini dianggap berhasil?" />
            </div>
            <div className="space-y-1.5">
              <Label>PIC utama</Label>
              <Select value={form.lead_staff_id || "NONE"} onValueChange={(v) => setForm({ ...form, lead_staff_id: v === "NONE" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih PIC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Belum ditentukan</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.staff_id} value={s.staff_id}>
                      {s.name}
                      {s.position ? ` · ${s.position}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Deadline</Label>
                <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Mulai (opsional)</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>
              Batal
            </Button>
            <Button onClick={createProject} disabled={saving || !form.name.trim()}>
              {saving ? "Menyimpan…" : "Buat & Susun"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "amber" | "red" | "sky" }) {
  const toneClass =
    tone === "amber"
      ? "border-amber-300 bg-amber-50 text-amber-900"
      : tone === "red"
        ? "border-red-300 bg-red-50 text-red-900"
        : tone === "sky"
          ? "border-sky-300 bg-sky-50 text-sky-900"
          : "bg-card";
  return (
    <div className={cn("rounded-lg border px-1 py-2", toneClass)}>
      <p className="text-xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-[10px] leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}

function ProjectCard({ project: p }: { project: ProjectSummaryDto }) {
  return (
    <Link href={`/projects/${p.id}`} className="block">
      <Card className="h-full transition hover:border-primary/40">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold">{p.name}</p>
              <p className="text-xs text-muted-foreground">
                PIC: {p.lead_name || "belum ditentukan"}
                {p.pic_names.length > 1 ? ` +${p.pic_names.length - 1}` : ""}
              </p>
            </div>
            {p.setup_status === "PUBLISHED" ? (
              <span className={cn("shrink-0 rounded-full px-2 py-1 text-[11px] font-medium", healthBadgeClass(p.health_derived))}>
                {HEALTH_LABEL[p.health_derived]}
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-violet-100 px-2 py-1 text-[11px] font-medium text-violet-800">
                {p.setup_status === "READY" ? "Siap dibagikan" : "Disiapkan"}
              </span>
            )}
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-muted-foreground">
                {p.milestone_done} / {p.milestone_total} milestone disetujui
              </span>
              <strong>{p.progress}%</strong>
            </div>
            <Progress value={p.progress} />
          </div>

          {p.focus_text && p.setup_status === "PUBLISHED" ? (
            <p className="rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Berikutnya </span>
              {p.focus_text}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>Deadline {formatDeadline(p.deadline)}</span>
            {p.waiting_validation ? <span className="font-semibold text-sky-700">{p.waiting_validation} menunggu validasi</span> : null}
            {p.revision ? <span className="font-semibold text-red-700">{p.revision} direvisi</span> : null}
            {p.overdue ? <span className="font-semibold text-red-700">{p.overdue} terlambat</span> : null}
            {p.active_blockers ? (
              <span className="inline-flex items-center gap-1 font-semibold text-red-700">
                <AlertTriangle className="size-3" /> {p.active_blockers} kendala
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

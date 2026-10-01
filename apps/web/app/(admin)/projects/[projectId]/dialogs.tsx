"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatStamp, MILESTONE_LABEL } from "@/lib/project-ui";
import type {
  ProjectMilestoneDto,
  ProjectPicWorkloadDto,
  ProjectStaffOption,
  ProjectStatus,
  ProjectHealth,
  ProjectDetailDto,
  ProjectWorkstreamDto,
} from "@/lib/project-types";
import { HEALTH_LABEL, PROJECT_STATUS_LABEL } from "@/lib/project-ui";

export function StaffSelect({
  staff,
  value,
  onChange,
  placeholder = "Pilih PIC",
}: {
  staff: ProjectStaffOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Select value={value || "NONE"} onValueChange={(v) => onChange(v === "NONE" ? "" : v)}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
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
  );
}

/* ─── edit project ─── */

export function EditProjectDialog({
  open,
  project,
  staff,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  project: ProjectDetailDto;
  staff: ProjectStaffOption[];
  saving: boolean;
  onClose: () => void;
  onSave: (patch: Record<string, unknown>) => void;
}) {
  const [f, setF] = useState({ name: "", goal: "", lead: "", deadline: "", status: "ACTIVE" as ProjectStatus, override: "AUTO", next: "" });
  useEffect(() => {
    if (open) {
      setF({
        name: project.name,
        goal: project.goal || "",
        lead: project.lead_staff_id || "",
        deadline: project.deadline || "",
        status: project.status,
        override: project.health_override || "AUTO",
        next: project.next_action || "",
      });
    }
  }, [open, project]);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>Progress dihitung otomatis dari milestone yang disetujui, tidak diisi manual.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nama</Label>
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Goal / Definition of Done</Label>
            <Textarea value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>PIC utama</Label>
            <StaffSelect staff={staff} value={f.lead} onChange={(v) => setF({ ...f, lead: v })} />
            <p className="text-xs text-muted-foreground">Mengganti PIC menonaktifkan link PIC lama; riwayat tetap tersimpan.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Deadline</Label>
              <Input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v as ProjectStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{PROJECT_STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Kondisi project</Label>
            <Select value={f.override} onValueChange={(v) => setF({ ...f, override: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AUTO">Otomatis (disarankan)</SelectItem>
                {(Object.keys(HEALTH_LABEL) as ProjectHealth[]).map((h) => (
                  <SelectItem key={h} value={h}>Paksa: {HEALTH_LABEL[h]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fokus yang disematkan (opsional)</Label>
            <Input value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} placeholder="Kosongkan agar fokus ditentukan otomatis" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button
            disabled={saving || !f.name.trim()}
            onClick={() =>
              onSave({
                name: f.name,
                goal: f.goal || null,
                lead_staff_id: f.lead || null,
                deadline: f.deadline || null,
                status: f.status,
                health_override: f.override === "AUTO" ? null : f.override,
                next_action: f.next || null,
              })
            }
          >
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── workstream ─── */

export function WorkstreamDialog({
  open,
  workstream,
  staff,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  workstream: ProjectWorkstreamDto | null;
  staff: ProjectStaffOption[];
  saving: boolean;
  onClose: () => void;
  onSave: (v: { name: string; owner_staff_id: string | null; weight: number; deadline: string | null }) => void;
}) {
  const [f, setF] = useState({ name: "", owner: "", weight: "1", deadline: "" });
  useEffect(() => {
    if (open) {
      setF({
        name: workstream?.name || "",
        owner: workstream?.owner_staff_id || "",
        weight: String(workstream?.weight ?? 1),
        deadline: workstream?.deadline || "",
      });
    }
  }, [open, workstream]);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{workstream ? "Edit Bagian Kerja" : "Tambah Bagian Kerja"}</DialogTitle>
          <DialogDescription>Bagian kerja dipegang satu PIC yang bertanggung jawab. Tanpa PIC bagian, PIC utama yang memegang.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nama bagian</Label>
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Contoh: Produk & Pakan" />
          </div>
          <div className="space-y-1.5">
            <Label>PIC bagian</Label>
            <StaffSelect staff={staff} value={f.owner} onChange={(v) => setF({ ...f, owner: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Bobot</Label>
              <Input type="number" min={1} max={100} value={f.weight} onChange={(e) => setF({ ...f, weight: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Deadline</Label>
              <Input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button
            disabled={saving || !f.name.trim()}
            onClick={() =>
              onSave({
                name: f.name,
                owner_staff_id: f.owner || null,
                weight: Number(f.weight) || 1,
                deadline: f.deadline || null,
              })
            }
          >
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── milestone ─── */

export function MilestoneDialog({
  open,
  milestone,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  /** null = milestone baru. */
  milestone: ProjectMilestoneDto | null;
  saving: boolean;
  onClose: () => void;
  onSave: (v: { title: string; description: string | null; weight: number; deadline: string | null; steps: { item_text: string; requires_evidence: boolean }[] }) => void;
}) {
  const [f, setF] = useState({ title: "", description: "", weight: "1", deadline: "", steps: "" });
  useEffect(() => {
    if (open) {
      setF({
        title: milestone?.title || "",
        description: milestone?.description || "",
        weight: String(milestone?.weight ?? 1),
        deadline: milestone?.deadline || "",
        steps: "",
      });
    }
  }, [open, milestone]);
  const parsed = f.steps
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      item_text: line.replace(/\[foto\]/gi, "").trim(),
      requires_evidence: /\[foto\]/i.test(line),
    }))
    .filter((s) => s.item_text);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{milestone ? "Edit Milestone" : "Tambah Milestone"}</DialogTitle>
          <DialogDescription>Milestone = hasil antara yang konkret. Langkah-langkahnya jadi checklist untuk PIC.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nama milestone</Label>
            <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Contoh: Mapping SKU selesai" />
          </div>
          <div className="space-y-1.5">
            <Label>Keterangan (opsional)</Label>
            <Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Bobot</Label>
              <Input type="number" min={1} max={100} value={f.weight} onChange={(e) => setF({ ...f, weight: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Deadline</Label>
              <Input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} />
            </div>
          </div>
          {!milestone ? (
            <div className="space-y-1.5">
              <Label>Langkah checklist (satu per baris)</Label>
              <Textarea
                rows={7}
                value={f.steps}
                onChange={(e) => setF({ ...f, steps: e.target.value })}
                placeholder={"Daftar jenis ikan\nCatat ukuran\nFoto produk [foto]"}
              />
              <p className="text-xs text-muted-foreground">
                Tulis <code>[foto]</code> di akhir baris bila PIC wajib upload bukti foto. {parsed.length} langkah terbaca.
              </p>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button
            disabled={saving || !f.title.trim()}
            onClick={() =>
              onSave({
                title: f.title,
                description: f.description || null,
                weight: Number(f.weight) || 1,
                deadline: f.deadline || null,
                steps: parsed,
              })
            }
          >
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── review ─── */

export function ReviewDialog({
  milestone,
  context,
  saving,
  onClose,
  onDecide,
}: {
  milestone: ProjectMilestoneDto | null;
  context: string;
  saving: boolean;
  onClose: () => void;
  onDecide: (decision: "APPROVED" | "REVISION", note: string) => void;
}) {
  const [note, setNote] = useState("");
  useEffect(() => setNote(""), [milestone?.id]);
  const pending = milestone?.reviews.find((r) => r.status === "PENDING") || null;
  const rows =
    pending && pending.snapshot.length
      ? pending.snapshot
      : (milestone?.steps || []).map((s) => ({
          item_text: s.item_text,
          is_required: s.is_required,
          is_checked: s.is_checked,
          note: s.note,
          evidence_url: s.evidence_url,
        }));
  return (
    <Dialog open={Boolean(milestone)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{milestone?.title}</DialogTitle>
          <DialogDescription>
            {context}
            {pending ? ` · diajukan ${pending.submitted_by_name}, ${formatStamp(pending.submitted_at)}` : ""}
          </DialogDescription>
        </DialogHeader>
        {milestone && milestone.status !== "WAITING_VALIDATION" ? (
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            Milestone ini sudah tidak menunggu validasi ({MILESTONE_LABEL[milestone.status]}). Muat ulang halaman.
          </p>
        ) : null}
        <ul className="space-y-2">
          {rows.map((s, i) => (
            <li key={i} className="rounded-md border p-2 text-sm">
              <p>
                <span className={s.is_checked ? "text-emerald-600" : "text-muted-foreground"}>{s.is_checked ? "☑" : "☐"}</span>{" "}
                {s.item_text}
                {!s.is_required ? <span className="text-xs text-muted-foreground"> (opsional)</span> : null}
              </p>
              {s.note ? <p className="mt-1 text-xs italic text-muted-foreground">Catatan PIC: {s.note}</p> : null}
              {s.evidence_url ? (
                <a href={s.evidence_url} target="_blank" rel="noreferrer" className="mt-2 block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.evidence_url} alt="Bukti" className="max-h-48 rounded-md border object-contain" />
                </a>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="space-y-1.5">
          <Label>Catatan (wajib bila minta revisi)</Label>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: Foto Blue Texas belum ada ukuran pembanding. Tambahkan foto dengan penggaris." />
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" disabled={saving || !note.trim() || milestone?.status !== "WAITING_VALIDATION"} onClick={() => onDecide("REVISION", note)}>
            Minta Revisi
          </Button>
          <Button disabled={saving || milestone?.status !== "WAITING_VALIDATION"} onClick={() => onDecide("APPROVED", note)}>
            Setujui
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── beban kerja PIC ─── */

export function PicWorkloadDialog({
  data,
  onClose,
}: {
  data: ProjectPicWorkloadDto | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(data)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{data?.name}</DialogTitle>
          <DialogDescription>Konteks kerja: project yang sedang dipegang.</DialogDescription>
        </DialogHeader>
        {data && !data.projects.length ? <p className="text-sm text-muted-foreground">Tidak memegang project aktif.</p> : null}
        <ul className="space-y-2">
          {data?.projects.map((p) => (
            <li key={p.project_id} className="rounded-md border p-3 text-sm">
              <p className="font-semibold">{p.project_name}</p>
              <p className="text-xs text-muted-foreground">
                {p.role === "PIC_UTAMA" ? "PIC utama" : `Bagian: ${p.workstream_names.join(", ")}`}
              </p>
              <p className="mt-1">
                Progress <strong>{p.progress}%</strong>
                {p.waiting_validation ? ` · ${p.waiting_validation} menunggu validasi` : ""}
                {p.overdue ? ` · ${p.overdue} terlambat` : ""}
              </p>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DISCIPLINARY_SOURCE_OPTIONS,
  type CreateDisciplinaryLetterPayload,
  type DisciplinaryEvidenceInput,
  type DisciplinaryLetterLevel,
  type DisciplinaryLetterType,
  type DisciplinarySourceType,
  type DisciplinaryTaskPrefill,
} from "@nusafood/types";
import { AdminPage } from "@/components/admin-page";
import { PhotoUploader } from "@/components/photo-uploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Eye, Loader2, Sparkles } from "lucide-react";
import type { DisciplinaryLetter } from "@nusafood/types";
import { checkLetterTimeline } from "@/lib/letter/letter-format";
import { buildLetterDocumentHtml } from "@/lib/letter/letter-html";
import { TaskPicker } from "./task-picker";

type ApiResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

type StaffOption = {
  staff_id: string;
  name: string;
  position?: string | null;
  outlet?: string;
};

const FAKE_REPORT_WARNING =
  "Kasus laporan/foto tidak valid termasuk pelanggaran integritas. Pastikan bukti lengkap sebelum diproses sebagai SP.";

const defaultForm = (): CreateDisciplinaryLetterPayload => ({
  type: "TEGURAN",
  level: 1,
  employee_id: "",
  outlet_name: "",
  source_type: "TASK_LATE",
  incident_date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()),
  chronology: "",
  violation_detail: "",
  correction_instruction:
    "Selesaikan tugas sesuai deadline, kirim laporan dengan foto asli dan jelas, serta laporkan kendala ke leader sebelum deadline.",
  evidence: [],
});

export default function NewTeguranForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<CreateDisciplinaryLetterPayload>(defaultForm);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [integrityWarning, setIntegrityWarning] = useState(false);
  const [employeeWarning, setEmployeeWarning] = useState<string | null>(null);
  const [evidenceNote, setEvidenceNote] = useState("");
  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [taskInfo, setTaskInfo] = useState<{ title?: string; deadline?: string } | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [polishing, setPolishing] = useState(false);
  const submittingRef = useRef(false);

  const taskId = search.get("task_id");
  const editId = search.get("edit");

  const employeeValid = useMemo(() => {
    const id = form.employee_id?.trim() || "";
    if (!id || id === "UNKNOWN" || id === "UNASSIGNED") return false;
    const digits = id.replace(/\D/g, "");
    if (digits.length >= 8 && digits === id.replace(/[\s+-]/g, "")) return false;
    return staff.some((s) => s.staff_id === id) || Boolean(id && staff.length === 0);
  }, [form.employee_id, staff]);

  const evidenceIncomplete = (form.evidence || []).length === 0;

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/staff?status=ACTIVE", {
          credentials: "include",
        });
        const json = (await res.json()) as ApiResponse<
          Array<{
            staff_id: string;
            name: string;
            position?: string | null;
            outlet?: string;
          }>
        >;
        if (json.success && json.data) {
          setStaff(
            json.data.map((s) => ({
              staff_id: s.staff_id,
              name: s.name,
              position: s.position,
              outlet: s.outlet,
            })),
          );
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const loadTaskPrefill = useCallback(async (prefillTaskId: string) => {
    setLoadingPrefill(true);
    try {
      const res = await fetch(
        `/api/disciplinary/from-task/${encodeURIComponent(prefillTaskId)}`,
        { credentials: "include" },
      );
      const json = (await res.json()) as ApiResponse<DisciplinaryTaskPrefill>;
      if (!json.success || !json.data) {
        toast({
          title: "Gagal prefill dari task",
          description:
            json.error ||
            "Gagal membuat teguran dari task. Cek relasi task dan karyawan.",
          variant: "destructive",
        });
        return;
      }
      const p = json.data;
      setTaskInfo({ title: p.task_title, deadline: p.task_deadline });
      setIntegrityWarning(p.integrity_warning || p.source_type === "FAKE_REPORT");
      setEmployeeWarning(
        p.employee_valid
          ? null
          : p.employee_warning ||
              "Task belum punya relasi karyawan valid. Pilih karyawan dulu sebelum surat dikirim.",
      );
      setForm({
        type: p.suggested_type,
        level: p.suggested_level,
        employee_id: p.employee_id || "",
        employee_name: p.employee_name,
        employee_position: p.employee_position,
        outlet_id: p.outlet_id,
        outlet_name: p.outlet_name,
        related_task_id: p.related_task_id,
        source_type: p.source_type,
        incident_date: p.incident_date,
        title: p.title,
        chronology: p.chronology,
        violation_detail: p.violation_detail,
        correction_instruction: p.correction_instruction,
        evidence: p.evidence,
      });
      if (p.previous_letter_count > 0 && p.employee_valid) {
        toast({
          title: "Riwayat teguran ditemukan",
          description: `Karyawan ini sudah punya ${p.previous_letter_count} surat sebelumnya. Level disarankan ST/SP ${p.suggested_level}.`,
        });
      }
    } finally {
      setLoadingPrefill(false);
    }
  }, [toast]);

  useEffect(() => {
    if (taskId) void loadTaskPrefill(taskId);
  }, [taskId, loadTaskPrefill]);

  useEffect(() => {
    if (!editId) return;
    void (async () => {
      const res = await fetch(`/api/disciplinary/${editId}`, {
        credentials: "include",
      });
      const json = (await res.json()) as ApiResponse<{
        type: DisciplinaryLetterType;
        level: DisciplinaryLetterLevel;
        employee_id: string;
        employee_name_snapshot: string;
        employee_position_snapshot?: string | null;
        outlet_id?: string | null;
        outlet_name_snapshot: string;
        related_task_id?: string | null;
        source_type: DisciplinarySourceType;
        incident_date: string;
        title: string;
        chronology: string;
        violation_detail: string;
        operational_impact?: string | null;
        correction_instruction: string;
        correction_deadline?: string | null;
        sop_reference?: string | null;
        consequence?: string | null;
        internal_note?: string | null;
        evidence?: DisciplinaryEvidenceInput[];
      }>;
      if (!json.success || !json.data) return;
      const d = json.data;
      const id = d.employee_id || "";
      if (!id || id === "UNASSIGNED" || id === "UNKNOWN") {
        setEmployeeWarning(
          "Task belum punya relasi karyawan valid. Pilih karyawan dulu sebelum surat dikirim.",
        );
      }
      if (d.source_type === "FAKE_REPORT") setIntegrityWarning(true);
      setForm({
        type: d.type,
        level: d.level,
        employee_id: id === "UNASSIGNED" || id === "UNKNOWN" ? "" : id,
        employee_name: d.employee_name_snapshot,
        employee_position: d.employee_position_snapshot,
        outlet_id: d.outlet_id,
        outlet_name: d.outlet_name_snapshot,
        related_task_id: d.related_task_id,
        source_type: d.source_type,
        incident_date: d.incident_date,
        title: d.title,
        chronology: d.chronology,
        violation_detail: d.violation_detail,
        operational_impact: d.operational_impact,
        correction_instruction: d.correction_instruction,
        correction_deadline: d.correction_deadline,
        sop_reference: d.sop_reference,
        consequence: d.consequence,
        internal_note: d.internal_note,
        evidence: d.evidence || [],
      });
    })();
  }, [editId]);

  const selectedStaff = useMemo(
    () => staff.find((s) => s.staff_id === form.employee_id),
    [staff, form.employee_id],
  );

  // Edit / input manual: ambil deadline task terkait untuk validasi tanggal.
  const relatedTaskId = form.related_task_id?.trim() || "";
  useEffect(() => {
    if (!relatedTaskId || taskInfo?.deadline) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      void fetch(`/api/tasks/${encodeURIComponent(relatedTaskId)}`, {
        credentials: "include",
        signal: ctrl.signal,
      })
        .then((res) => res.json())
        .then((json: { success?: boolean; data?: { task_title?: string; deadline?: string } }) => {
          if (json.success && json.data?.deadline) {
            setTaskInfo({ title: json.data.task_title, deadline: json.data.deadline });
          }
        })
        .catch(() => undefined);
    }, 400);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [relatedTaskId, taskInfo?.deadline]);

  const timelineIssues = useMemo(
    () =>
      checkLetterTimeline({
        incident_date: form.incident_date,
        correction_deadline: form.correction_deadline,
        task_deadline: taskInfo?.deadline,
      }),
    [form.incident_date, form.correction_deadline, taskInfo?.deadline],
  );
  const timelineBlocked = timelineIssues.some((i) => i.level === "error");

  function openPreview() {
    const now = new Date().toISOString();
    const letter: DisciplinaryLetter = {
      id: editId || "preview",
      letter_number: "",
      type: form.type,
      level: form.level,
      status: "DRAFT",
      employee_id: form.employee_id || "",
      employee_name_snapshot: form.employee_name || selectedStaff?.name || "(pilih karyawan)",
      employee_position_snapshot: form.employee_position || selectedStaff?.position || null,
      outlet_id: form.outlet_id,
      outlet_name_snapshot: form.outlet_name || selectedStaff?.outlet || "",
      related_task_id: form.related_task_id,
      source_type: form.source_type,
      incident_date: form.incident_date || now.slice(0, 10),
      created_by: "",
      title: form.title || "",
      chronology: form.chronology,
      violation_detail: form.violation_detail,
      operational_impact: form.operational_impact,
      correction_instruction: form.correction_instruction,
      correction_deadline: form.correction_deadline,
      sop_reference: form.sop_reference,
      consequence: form.consequence,
      created_at: now,
      updated_at: now,
      evidence: (form.evidence || []).map((e, i) => ({
        id: String(i),
        disciplinary_letter_id: "",
        evidence_type: e.evidence_type,
        file_url: e.file_url,
        text_note: e.text_note,
        created_by: "",
        created_at: now,
      })),
    };
    setPreviewHtml(
      buildLetterDocumentHtml(letter, {
        origin: window.location.origin,
        preview: true,
        embed: true,
      }),
    );
  }

  async function polishWithAi() {
    if (polishing) return;
    setPolishing(true);
    try {
      const res = await fetch("/api/ai/letter-polish", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          letter_type: form.type,
          employee_name: form.employee_name || selectedStaff?.name,
          task_title: taskInfo?.title,
          incident_date: form.incident_date,
          chronology: form.chronology,
          violation_detail: form.violation_detail,
          operational_impact: form.operational_impact || "",
          correction_instruction: form.correction_instruction,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as ApiResponse<{
        chronology: string;
        violation_detail: string;
        operational_impact: string;
        correction_instruction: string;
      }>;
      if (!json.success || !json.data) {
        throw new Error(json.error || `Server error (${res.status})`);
      }
      const d = json.data;
      setForm((prev) => ({
        ...prev,
        chronology: d.chronology || prev.chronology,
        violation_detail: d.violation_detail || prev.violation_detail,
        operational_impact: d.operational_impact || prev.operational_impact,
        correction_instruction: d.correction_instruction || prev.correction_instruction,
      }));
      toast({
        title: "Bahasa surat dirapikan",
        description: "Periksa kembali — fakta & tanggal harus tetap sama.",
      });
    } catch (cause) {
      toast({
        title: "AI gagal merapikan",
        description: cause instanceof Error ? cause.message : "Coba lagi",
        variant: "destructive",
      });
    } finally {
      setPolishing(false);
    }
  }

  function update<K extends keyof CreateDisciplinaryLetterPayload>(
    key: K,
    value: CreateDisciplinaryLetterPayload[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "source_type" && value === "FAKE_REPORT") {
      setIntegrityWarning(true);
    }
  }

  function addEvidenceFromUpload(url: string | undefined) {
    if (!url) return;
    const item: DisciplinaryEvidenceInput = {
      evidence_type: "PHOTO",
      file_url: url,
      text_note: evidenceNote.trim() || "Foto bukti teguran",
    };
    setForm((prev) => ({
      ...prev,
      evidence: [...(prev.evidence || []), item],
    }));
    setEvidenceNote("");
    toast({ title: "Bukti foto ditambahkan" });
  }

  function addEvidenceNoteOnly() {
    if (!evidenceNote.trim()) {
      toast({
        title: "Catatan kosong",
        description: "Isi catatan bukti, atau upload foto di bawah.",
        variant: "destructive",
      });
      return;
    }
    const item: DisciplinaryEvidenceInput = {
      evidence_type: "NOTE",
      text_note: evidenceNote.trim(),
    };
    setForm((prev) => ({
      ...prev,
      evidence: [...(prev.evidence || []), item],
    }));
    setEvidenceNote("");
  }

  function save(submitForApproval = false) {
    if (submittingRef.current) return;
    if (timelineBlocked) {
      toast({
        title: "Tanggal surat belum logis",
        description: timelineIssues.find((i) => i.level === "error")?.message,
        variant: "destructive",
      });
      return;
    }
    if (submitForApproval && !employeeValid) {
      toast({
        title: "Karyawan belum valid",
        description:
          employeeWarning ||
          "Pilih karyawan dari daftar sebelum ajukan approval / proses formal.",
        variant: "destructive",
      });
      return;
    }
    if (submitForApproval && evidenceIncomplete) {
      toast({
        title: "Bukti belum lengkap",
        description: "Tambahkan bukti dulu sebelum ajukan approval SP.",
        variant: "destructive",
      });
      return;
    }

    submittingRef.current = true;
    startTransition(async () => {
      try {
      const payload: CreateDisciplinaryLetterPayload = {
        ...form,
        employee_name: form.employee_name || selectedStaff?.name,
        employee_position:
          form.employee_position || selectedStaff?.position || null,
        outlet_name: form.outlet_name || selectedStaff?.outlet || form.outlet_name,
        submit_for_approval: submitForApproval,
      };

      if (editId) {
        const res = await fetch(`/api/disciplinary/${editId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json()) as ApiResponse<{ id: string }>;
        if (!json.success || !json.data) {
          toast({
            title: "Gagal menyimpan",
            description: json.error || "Coba lagi",
            variant: "destructive",
          });
          return;
        }
        if (submitForApproval) {
          const approveRes = await fetch(`/api/disciplinary/${editId}/actions`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "submit_approval" }),
          });
          const approveJson = (await approveRes.json()) as ApiResponse<unknown>;
          if (!approveJson.success) {
            toast({
              title: "Draft tersimpan, approval gagal",
              description: approveJson.error || "Lengkapi data lalu ajukan lagi.",
              variant: "destructive",
            });
            router.push(`/teguran/${editId}`);
            return;
          }
        }
        toast({
          title: submitForApproval
            ? "Diajukan untuk approval"
            : "Draft teguran tersimpan",
        });
        router.push(`/teguran/${editId}`);
        return;
      }

      const res = await fetch("/api/disciplinary", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as ApiResponse<{ id: string }>;
      if (!json.success || !json.data) {
        toast({
          title: "Gagal membuat teguran",
          description: json.error || "Coba lagi",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: submitForApproval
          ? "Diajukan untuk approval"
          : "Draft teguran tersimpan",
      });
      router.push(`/teguran/${json.data.id}`);
      } finally {
        submittingRef.current = false;
      }
    });
  }

  return (
    <AdminPage title="Buat Draft Teguran / SP" backHref="/teguran" maxWidth="2xl">
      {loadingPrefill ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Mengisi data dari task...
          </CardContent>
        </Card>
      ) : null}

      {taskId ? (
        <Card className="border-sky-200 bg-sky-50">
          <CardContent className="p-4 text-sm text-sky-950">
            Dari task terlambat: form ini hanya membuat <strong>draft</strong>.
            Surat tidak langsung dikirim.
          </CardContent>
        </Card>
      ) : null}

      {employeeWarning ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-950">
            {employeeWarning}
          </CardContent>
        </Card>
      ) : null}

      {!employeeValid && !employeeWarning && form.employee_id ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-950">
            Karyawan belum valid. Pilih karyawan dari daftar sebelum surat
            dikirim.
          </CardContent>
        </Card>
      ) : null}

      {integrityWarning || form.source_type === "FAKE_REPORT" ? (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-4 text-sm text-red-900">
            <strong>Peringatan integritas.</strong> {FAKE_REPORT_WARNING}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="grid gap-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Jenis surat</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={form.type}
                onChange={(e) =>
                  update("type", e.target.value as DisciplinaryLetterType)
                }
              >
                <option value="TEGURAN">Surat Teguran (ST)</option>
                <option value="PERINGATAN">Surat Peringatan (SP)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Level</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={form.level}
                onChange={(e) =>
                  update("level", Number(e.target.value) as DisciplinaryLetterLevel)
                }
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Karyawan</Label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.employee_id}
              onChange={(e) => {
                const s = staff.find((x) => x.staff_id === e.target.value);
                setEmployeeWarning(null);
                setForm((prev) => ({
                  ...prev,
                  employee_id: e.target.value,
                  employee_name: s?.name,
                  employee_position: s?.position,
                  outlet_name: s?.outlet || prev.outlet_name,
                }));
              }}
            >
              <option value="">Pilih karyawan</option>
              {staff.map((s) => (
                <option key={s.staff_id} value={s.staff_id}>
                  {s.name} ({s.staff_id})
                </option>
              ))}
            </select>
            {!staff.length ? (
              <Input
                placeholder="Staff ID manual"
                value={form.employee_id}
                onChange={(e) => update("employee_id", e.target.value)}
              />
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Outlet</Label>
              <Input
                value={form.outlet_name || ""}
                onChange={(e) => update("outlet_name", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal kejadian</Label>
              <Input
                type="date"
                value={form.incident_date}
                onChange={(e) => update("incident_date", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Sumber kasus</Label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.source_type}
              onChange={(e) =>
                update("source_type", e.target.value as DisciplinarySourceType)
              }
            >
              {DISCIPLINARY_SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0 space-y-1.5">
            <Label>Tugas terkait</Label>
            <TaskPicker
              value={form.related_task_id || ""}
              title={taskInfo?.title}
              employeeId={employeeValid ? form.employee_id : ""}
              employeeName={form.employee_name || selectedStaff?.name}
              onPick={(id) => {
                setTaskInfo(null);
                void loadTaskPrefill(id);
              }}
              onClear={() => {
                setTaskInfo(null);
                update("related_task_id", "");
              }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Tulis apa adanya, lalu rapikan jadi bahasa surat formal. Fakta &amp;
              tanggal tidak diubah.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void polishWithAi()}
              disabled={polishing || pending}
            >
              {polishing ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 size-4" />
              )}
              Rapikan bahasa (AI)
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label>Kronologi singkat</Label>
            <Textarea
              rows={3}
              value={form.chronology}
              onChange={(e) => update("chronology", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Bentuk pelanggaran</Label>
            <Textarea
              rows={3}
              value={form.violation_detail}
              onChange={(e) => update("violation_detail", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Dampak operasional</Label>
            <Textarea
              rows={2}
              value={form.operational_impact || ""}
              onChange={(e) => update("operational_impact", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Instruksi perbaikan</Label>
            <Textarea
              rows={3}
              value={form.correction_instruction}
              onChange={(e) => update("correction_instruction", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Deadline perbaikan</Label>
            <Input
              type="date"
              value={form.correction_deadline || ""}
              onChange={(e) => update("correction_deadline", e.target.value)}
            />
          </div>

          {form.type === "PERINGATAN" ? (
            <>
              <div className="space-y-1.5">
                <Label>Pasal / SOP yang dilanggar</Label>
                <Textarea
                  rows={2}
                  value={form.sop_reference || ""}
                  onChange={(e) => update("sop_reference", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Konsekuensi jika mengulang</Label>
                <Textarea
                  rows={2}
                  value={form.consequence || ""}
                  onChange={(e) => update("consequence", e.target.value)}
                />
              </div>
            </>
          ) : null}

          <div className="space-y-1.5">
            <Label>Catatan internal</Label>
            <Textarea
              rows={2}
              value={form.internal_note || ""}
              onChange={(e) => update("internal_note", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <h3 className="font-semibold">Bukti foto (kamera / galeri)</h3>
          <p className="text-sm text-muted-foreground">
            Ambil foto langsung atau pilih dari galeri. Tidak perlu isi link.
          </p>
          <PhotoUploader
            label="Ambil / pilih foto bukti"
            size="large"
            upload={{
              taskId: form.related_task_id || `teguran-${Date.now()}`,
              context: "disciplinary",
            }}
            onChange={(url) => {
              if (url) addEvidenceFromUpload(url);
            }}
          />
          <div className="space-y-1.5">
            <Label>Catatan bukti (opsional)</Label>
            <Input
              placeholder="Misal: area kotor / foto tidak sesuai"
              value={evidenceNote}
              onChange={(e) => setEvidenceNote(e.target.value)}
            />
          </div>
          {evidenceIncomplete ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Bukti belum lengkap. Draft tetap bisa disimpan; kirim / approval
              formal wajib ada bukti.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {(form.evidence || []).map((e, idx) => (
                <li
                  key={`${e.evidence_type}-${idx}`}
                  className="rounded border p-2"
                >
                  <span className="font-medium">{e.evidence_type}</span>
                  {e.text_note ? ` — ${e.text_note}` : ""}
                  {e.file_url ? (
                    <div className="mt-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={e.file_url}
                        alt="Bukti"
                        className="max-h-40 rounded object-cover"
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <Button type="button" variant="outline" onClick={addEvidenceNoteOnly}>
            Tambah catatan saja (tanpa foto)
          </Button>
        </CardContent>
      </Card>

      {timelineIssues.length ? (
        <Card
          className={
            timelineBlocked ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50"
          }
        >
          <CardContent className="space-y-1 p-4 text-sm">
            <p className="font-semibold">
              {timelineBlocked ? "Tanggal belum logis — perbaiki dulu" : "Cek urutan tanggal"}
            </p>
            <ul className="list-disc space-y-0.5 pl-5">
              {timelineIssues.map((issue) => (
                <li key={issue.message}>{issue.message}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Button type="button" variant="outline" onClick={openPreview}>
        <Eye className="mr-2 size-4" />
        Preview Surat
      </Button>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          className="flex-1"
          variant="secondary"
          disabled={pending || timelineBlocked}
          onClick={() => save(false)}
        >
          Simpan Draft Teguran
        </Button>
        {form.type === "PERINGATAN" ? (
          <Button
            className="flex-1"
            disabled={pending || !employeeValid || evidenceIncomplete || timelineBlocked}
            onClick={() => save(true)}
          >
            Ajukan Approval SP
          </Button>
        ) : null}
      </div>
      {form.type === "PERINGATAN" ? (
        <p className="text-xs text-muted-foreground">
          SP formal hanya lanjut setelah approval Admin/Owner. Tombol ini tidak
          mengirim surat ke karyawan.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Setelah draft tersimpan, kirim surat dilakukan di halaman detail
          (menandai status di sistem saja, bukan WA/email).
        </p>
      )}
      <Dialog open={previewHtml !== null} onOpenChange={(open) => !open && setPreviewHtml(null)}>
        <DialogContent className="flex h-[90vh] max-w-[min(900px,96vw)] flex-col gap-2 p-3 sm:max-w-[min(900px,96vw)]">
          <DialogHeader>
            <DialogTitle>Preview surat (draft)</DialogTitle>
          </DialogHeader>
          {previewHtml ? (
            <iframe
              title="Preview surat"
              srcDoc={previewHtml}
              className="min-h-0 w-full flex-1 rounded border bg-neutral-200"
            />
          ) : null}
          <p className="text-xs text-muted-foreground">
            Nomor surat dibuat saat draft disimpan. Cetak / Save PDF dari halaman
            detail surat.
          </p>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}

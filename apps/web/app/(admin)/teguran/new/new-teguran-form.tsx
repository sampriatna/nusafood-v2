"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
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
import { Eye, Loader2, Sparkles, X } from "lucide-react";
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
  const [history, setHistory] = useState<{ count: number; suggested: number } | null>(null);

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
      setHistory(
        p.employee_valid
          ? { count: p.previous_letter_count, suggested: p.suggested_level }
          : null,
      );
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

  const isSp = form.type === "PERINGATAN";
  const docLabel = isSp ? "Surat Peringatan" : "Surat Teguran";
  const outletText = form.outlet_name || selectedStaff?.outlet || "";

  function setDeadlineInDays(days: number) {
    const base = form.incident_date || new Date().toISOString().slice(0, 10);
    const [y, m, d] = base.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + days));
    update("correction_deadline", dt.toISOString().slice(0, 10));
  }

  function removeEvidence(index: number) {
    setForm((prev) => ({
      ...prev,
      evidence: (prev.evidence || []).filter((_, i) => i !== index),
    }));
  }

  return (
    <AdminPage
      title={editId ? `Edit Draft ${docLabel}` : "Buat Surat Teguran / SP"}
      backHref="/teguran"
      maxWidth="2xl"
    >
      <div className="space-y-4 pb-28">
        {loadingPrefill ? (
          <p className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Mengisi data dari tugas…
          </p>
        ) : null}

        {integrityWarning || form.source_type === "FAKE_REPORT" ? (
          <Notice tone="red">
            <strong>Peringatan integritas.</strong> {FAKE_REPORT_WARNING}
          </Notice>
        ) : null}

        <FormSection
          step={1}
          title="Kasus"
          description="Pilih tugas yang bermasalah — karyawan, kronologi, dan bukti terisi otomatis."
        >
          <Field label="Tugas terkait" hint="Opsional. Kosongkan jika kasus tidak berasal dari tugas.">
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
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Jenis kasus">
              <select
                className={SELECT_CLASS}
                value={form.source_type}
                onChange={(e) => update("source_type", e.target.value as DisciplinarySourceType)}
              >
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tanggal surat">
              <Input
                type="date"
                value={form.incident_date}
                onChange={(e) => update("incident_date", e.target.value)}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection step={2} title="Karyawan">
          <Field label="Nama karyawan">
            {staff.length ? (
              <select
                className={SELECT_CLASS}
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
                <option value="">Pilih karyawan…</option>
                {staff.map((s) => (
                  <option key={s.staff_id} value={s.staff_id}>
                    {s.name}
                    {s.position ? ` — ${s.position}` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                placeholder="ID staff"
                value={form.employee_id}
                onChange={(e) => update("employee_id", e.target.value)}
              />
            )}
          </Field>
          {form.employee_id ? (
            <p className="rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Jabatan:</span>{" "}
              {form.employee_position || selectedStaff?.position || "—"}
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="text-muted-foreground">Outlet:</span> {outletText || "—"}
            </p>
          ) : null}
          {employeeWarning || (!employeeValid && form.employee_id) ? (
            <Notice tone="amber">
              {employeeWarning || "Karyawan belum valid. Pilih dari daftar sebelum surat dikirim."}
            </Notice>
          ) : null}
          {history && history.count > 0 ? (
            <Notice tone="sky">
              Karyawan ini sudah punya {history.count} surat sebelumnya — disarankan level{" "}
              {["", "I", "II", "III"][history.suggested]}.
            </Notice>
          ) : null}
        </FormSection>

        <FormSection step={3} title="Jenis surat">
          <Segmented
            value={form.type}
            onChange={(v) => update("type", v as DisciplinaryLetterType)}
            options={[
              { value: "TEGURAN", label: "Surat Teguran", hint: "Pembinaan, langsung bisa dikirim" },
              { value: "PERINGATAN", label: "Surat Peringatan", hint: "Formal, perlu approval Admin/Owner" },
            ]}
          />
          <Field label="Tingkat">
            <Segmented
              value={String(form.level)}
              onChange={(v) => update("level", Number(v) as DisciplinaryLetterLevel)}
              options={[
                { value: "1", label: "I", hint: "Pertama" },
                { value: "2", label: "II", hint: "Kedua" },
                { value: "3", label: "III", hint: "Terakhir" },
              ]}
            />
          </Field>
        </FormSection>

        <FormSection
          step={4}
          title="Isi surat"
          description="Tulis apa adanya. Tombol AI merapikan jadi bahasa surat formal tanpa mengubah fakta & tanggal."
          action={
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
              Rapikan (AI)
            </Button>
          }
        >
          <Field label="Kronologi" required>
            <Textarea
              rows={3}
              value={form.chronology}
              onChange={(e) => update("chronology", e.target.value)}
              placeholder="Apa yang terjadi, kapan, dan di mana."
            />
          </Field>
          <Field label="Bentuk pelanggaran" required>
            <Textarea
              rows={2}
              value={form.violation_detail}
              onChange={(e) => update("violation_detail", e.target.value)}
              placeholder="Standar / aturan apa yang tidak dipenuhi."
            />
          </Field>
          <Field label="Dampak operasional" hint="Opsional">
            <Textarea
              rows={2}
              value={form.operational_impact || ""}
              onChange={(e) => update("operational_impact", e.target.value)}
              placeholder="Mis. pelanggan komplain, area kotor saat jam buka."
            />
          </Field>
          <Field label="Instruksi perbaikan" required>
            <Textarea
              rows={3}
              value={form.correction_instruction}
              onChange={(e) => update("correction_instruction", e.target.value)}
            />
          </Field>
          <Field label="Batas waktu perbaikan">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                className="w-auto"
                value={form.correction_deadline || ""}
                onChange={(e) => update("correction_deadline", e.target.value)}
              />
              {[3, 7, 14].map((days) => (
                <Button
                  key={days}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDeadlineInDays(days)}
                >
                  +{days} hari
                </Button>
              ))}
            </div>
          </Field>
          {isSp ? (
            <>
              <Field label="Pasal / SOP yang dilanggar">
                <Textarea
                  rows={2}
                  value={form.sop_reference || ""}
                  onChange={(e) => update("sop_reference", e.target.value)}
                />
              </Field>
              <Field label="Konsekuensi jika mengulang">
                <Textarea
                  rows={2}
                  value={form.consequence || ""}
                  onChange={(e) => update("consequence", e.target.value)}
                />
              </Field>
            </>
          ) : null}
          {timelineIssues.length ? (
            <Notice tone={timelineBlocked ? "red" : "amber"}>
              <p className="font-semibold">
                {timelineBlocked ? "Tanggal belum logis — perbaiki dulu" : "Cek urutan tanggal"}
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {timelineIssues.map((issue) => (
                  <li key={issue.message}>{issue.message}</li>
                ))}
              </ul>
            </Notice>
          ) : null}
        </FormSection>

        <FormSection
          step={5}
          title="Bukti pendukung"
          description={
            isSp
              ? "Wajib ada minimal satu bukti sebelum diajukan approval."
              : "Wajib ada minimal satu bukti sebelum surat dikirim."
          }
        >
          {(form.evidence || []).length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {(form.evidence || []).map((e, idx) => (
                <li
                  key={`${e.evidence_type}-${idx}`}
                  className="flex items-start gap-3 rounded-lg border p-2"
                >
                  {e.file_url && e.evidence_type === "PHOTO" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={e.file_url}
                      alt="Bukti"
                      className="size-14 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <span className="flex size-14 shrink-0 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                      {EVIDENCE_LABEL[e.evidence_type] ?? "Bukti"}
                    </span>
                  )}
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium">{EVIDENCE_LABEL[e.evidence_type] ?? "Bukti"}</p>
                    {e.text_note ? (
                      <p className="line-clamp-2 text-muted-foreground">{e.text_note}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="rounded p-1 text-muted-foreground hover:bg-muted"
                    aria-label="Hapus bukti"
                    onClick={() => removeEvidence(idx)}
                  >
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
              Belum ada bukti. Draft tetap bisa disimpan.
            </p>
          )}
          <Field label="Keterangan bukti" hint="Dipakai untuk foto berikutnya, atau simpan sebagai catatan.">
            <div className="flex gap-2">
              <Input
                placeholder="Mis. area toilet kotor jam 10.00"
                value={evidenceNote}
                onChange={(e) => setEvidenceNote(e.target.value)}
              />
              <Button type="button" variant="outline" onClick={addEvidenceNoteOnly}>
                Tambah catatan
              </Button>
            </div>
          </Field>
          <PhotoUploader
            label="Tambah foto bukti"
            upload={{
              taskId: form.related_task_id || `teguran-${Date.now()}`,
              context: "disciplinary",
            }}
            onChange={(url) => {
              if (url) addEvidenceFromUpload(url);
            }}
          />
        </FormSection>

        <FormSection step={6} title="Catatan internal" description="Tidak tercetak di surat — hanya terlihat oleh manajemen.">
          <Textarea
            rows={2}
            value={form.internal_note || ""}
            onChange={(e) => update("internal_note", e.target.value)}
          />
        </FormSection>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={openPreview}>
              <Eye className="mr-2 size-4" />
              Preview
            </Button>
            <Button
              type="button"
              className="flex-1"
              variant={isSp ? "outline" : "default"}
              disabled={pending || timelineBlocked}
              onClick={() => save(false)}
            >
              {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Simpan Draft
            </Button>
            {isSp ? (
              <Button
                type="button"
                className="flex-1"
                disabled={pending || !employeeValid || evidenceIncomplete || timelineBlocked}
                onClick={() => save(true)}
              >
                Ajukan Approval
              </Button>
            ) : null}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {isSp
              ? "SP berlaku setelah disetujui Admin/Owner."
              : "Setelah disimpan, surat dikirim dari halaman detail."}
          </p>
        </div>
      </div>

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

const SELECT_CLASS = "h-10 w-full rounded-md border bg-background px-3 text-base sm:text-sm";

const SOURCE_OPTIONS: { value: DisciplinarySourceType; label: string }[] = [
  { value: "TASK_LATE", label: "Tugas terlambat" },
  { value: "TASK_INCOMPLETE", label: "Tugas tidak selesai / tidak sesuai standar" },
  { value: "FAKE_REPORT", label: "Laporan palsu / foto tidak valid" },
  { value: "SOP_VIOLATION", label: "Pelanggaran SOP" },
  { value: "ATTENDANCE", label: "Kehadiran / absensi" },
  { value: "ATTITUDE", label: "Sikap kerja" },
  { value: "OTHER", label: "Lainnya" },
];

const EVIDENCE_LABEL: Partial<Record<DisciplinaryEvidenceInput["evidence_type"], string>> = {
  PHOTO: "Foto",
  SCREENSHOT: "Screenshot",
  TASK_REPORT: "Laporan tugas",
  NOTE: "Catatan",
  FILE: "File",
  LINK: "Laporan tugas",
};

function FormSection({
  step,
  title,
  description,
  action,
  children,
}: {
  step: number;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {step}
            </span>
            <h2 className="font-semibold">{title}</h2>
          </div>
          {action}
        </div>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; hint?: string }[];
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-lg border px-3 py-2 text-left transition-colors ${
              active ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50"
            }`}
          >
            <span className="block text-sm font-semibold">{o.label}</span>
            {o.hint ? <span className="block text-xs text-muted-foreground">{o.hint}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function Notice({ tone, children }: { tone: "amber" | "red" | "sky"; children: React.ReactNode }) {
  const cls = {
    amber: "border-amber-300 bg-amber-50 text-amber-950",
    red: "border-red-300 bg-red-50 text-red-900",
    sky: "border-sky-200 bg-sky-50 text-sky-950",
  }[tone];
  return <div className={`rounded-lg border px-3 py-2 text-sm ${cls}`}>{children}</div>;
}

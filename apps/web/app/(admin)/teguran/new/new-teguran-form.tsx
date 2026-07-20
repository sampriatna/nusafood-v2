"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
import { useToast } from "@/hooks/use-toast";

type ApiResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

type StaffOption = {
  staff_id: string;
  name: string;
  position?: string | null;
  outlet?: string;
};

const defaultForm = (): CreateDisciplinaryLetterPayload => ({
  type: "TEGURAN",
  level: 1,
  employee_id: "",
  outlet_name: "",
  source_type: "TASK_LATE",
  incident_date: new Date().toISOString().slice(0, 10),
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
  const [evidenceNote, setEvidenceNote] = useState("");
  const [loadingPrefill, setLoadingPrefill] = useState(false);

  const taskId = search.get("task_id");
  const editId = search.get("edit");

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

  useEffect(() => {
    if (!taskId) return;
    setLoadingPrefill(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/disciplinary/from-task/${encodeURIComponent(taskId)}`,
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
        setIntegrityWarning(p.integrity_warning);
        setForm({
          type: p.suggested_type,
          level: p.suggested_level,
          employee_id: p.employee_id,
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
        if (p.previous_letter_count > 0) {
          toast({
            title: "Riwayat teguran ditemukan",
            description: `Karyawan ini sudah punya ${p.previous_letter_count} surat sebelumnya. Level disarankan ST/SP ${p.suggested_level}.`,
          });
        }
      } finally {
        setLoadingPrefill(false);
      }
    })();
  }, [taskId, toast]);

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
      setForm({
        type: d.type,
        level: d.level,
        employee_id: d.employee_id,
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
    startTransition(async () => {
      const payload: CreateDisciplinaryLetterPayload = {
        ...form,
        employee_name: form.employee_name || selectedStaff?.name,
        employee_position:
          form.employee_position || selectedStaff?.position || null,
        outlet_name: form.outlet_name || selectedStaff?.outlet || form.outlet_name,
        submit_for_approval: submitForApproval || form.type === "PERINGATAN",
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
          await fetch(`/api/disciplinary/${editId}/actions`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "submit_approval" }),
          });
        }
        toast({ title: "Draft tersimpan" });
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
        title: submitForApproval ? "Diajukan untuk approval" : "Draft tersimpan",
      });
      router.push(`/teguran/${json.data.id}`);
    });
  }

  return (
    <AdminPage title="Buat Teguran / SP" backHref="/teguran" maxWidth="2xl">
      {loadingPrefill ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Mengisi data dari task...
          </CardContent>
        </Card>
      ) : null}

      {integrityWarning ? (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-4 text-sm text-red-900">
            <strong>Peringatan integritas.</strong> Laporan palsu / foto tidak
            valid adalah pelanggaran serius. Pertimbangkan SP dengan approval
            Owner/Admin.
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

          <div className="space-y-1.5">
            <Label>Task terkait</Label>
            <Input
              value={form.related_task_id || ""}
              onChange={(e) => update("related_task_id", e.target.value)}
              placeholder="TASK-..."
            />
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
            <Label>Detail kesalahan</Label>
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
          {(form.evidence || []).length === 0 ? (
            <p className="text-sm text-amber-800">
              Belum ada bukti. Draft tetap bisa disimpan; kirim surat wajib ada
              bukti.
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

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          className="flex-1"
          variant="secondary"
          disabled={pending}
          onClick={() => save(false)}
        >
          Simpan Draft
        </Button>
        <Button
          className="flex-1"
          disabled={pending}
          onClick={() => save(true)}
        >
          {form.type === "PERINGATAN" ? "Ajukan Approval" : "Simpan & Siap Kirim"}
        </Button>
      </div>
    </AdminPage>
  );
}

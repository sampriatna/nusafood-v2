"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type {
  DisciplinaryEvidenceInput,
  DisciplinaryLetter,
} from "@nusafood/types";
import { AdminPage } from "@/components/admin-page";
import { PhotoUploader } from "@/components/photo-uploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getLetterPreview } from "@/lib/services/disciplinary-preview";

type ApiResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

type MeResponse = {
  authenticated?: boolean;
  user?: {
    role?: string;
    name?: string;
  };
};

async function runAction(id: string, action: string, note?: string) {
  const res = await fetch(`/api/disciplinary/${id}/actions`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, note }),
  });
  return (await res.json()) as ApiResponse<DisciplinaryLetter>;
}

function isFormalEmployeeId(value: string | null | undefined): boolean {
  const id = (value || "").trim();
  if (!id || id === "UNKNOWN" || id === "UNASSIGNED") return false;
  const digits = id.replace(/\D/g, "");
  if (digits.length >= 8 && digits === id.replace(/[\s+-]/g, "")) return false;
  return true;
}

export default function TeguranDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast } = useToast();
  const [letter, setLetter] = useState<DisciplinaryLetter | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [isAdmin, setIsAdmin] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/disciplinary/${id}`, {
        credentials: "include",
      });
      const json = (await res.json()) as ApiResponse<DisciplinaryLetter>;
      if (!json.success || !json.data) {
        toast({
          title: "Gagal memuat detail",
          description: json.error || "Tidak ditemukan",
          variant: "destructive",
        });
        return;
      }
      setLetter(json.data);
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const json = (await res.json()) as ApiResponse<MeResponse>;
        const role = json.data?.user?.role || "";
        setIsAdmin(role === "ADMIN");
      } catch {
        setIsAdmin(false);
      }
    })();
  }, []);

  function act(action: string, successTitle: string) {
    startTransition(async () => {
      const json = await runAction(id, action);
      if (!json.success || !json.data) {
        toast({
          title: "Aksi gagal",
          description: json.error || "Coba lagi",
          variant: "destructive",
        });
        return;
      }
      setLetter(json.data);
      if (action === "generate_pdf") {
        toast({
          title:
            json.data.pdf_storage === "supabase"
              ? "Surat diarsipkan ke cloud"
              : "Preview sementara dibuat",
          description:
            json.data.pdf_storage === "supabase"
              ? "Tersimpan di Supabase Storage. Buka link untuk cetak / Save as PDF."
              : "Supabase Storage belum dikonfigurasi — ini belum arsip permanen.",
        });
        if (json.data.pdf_url) {
          window.open(json.data.pdf_url, "_blank", "noopener,noreferrer");
        }
        return;
      }
      toast({ title: successTitle });
    });
  }

  async function appendEvidencePhoto(url: string) {
    if (!letter) return;
    const evidence: DisciplinaryEvidenceInput[] = [
      ...(letter.evidence || []).map((e) => ({
        evidence_type: e.evidence_type,
        file_url: e.file_url,
        text_note: e.text_note,
        related_task_photo_id: e.related_task_photo_id,
      })),
      {
        evidence_type: "PHOTO" as const,
        file_url: url,
        text_note: "Foto bukti teguran",
      },
    ];
    const res = await fetch(`/api/disciplinary/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evidence }),
    });
    const json = (await res.json()) as ApiResponse<DisciplinaryLetter>;
    if (!json.success || !json.data) {
      toast({
        title: "Gagal menambah bukti",
        description: json.error || "Coba lagi",
        variant: "destructive",
      });
      return;
    }
    setLetter(json.data);
    toast({ title: "Bukti foto ditambahkan" });
  }

  if (loading) {
    return (
      <AdminPage title="Detail Teguran" backHref="/teguran">
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Memuat...
          </CardContent>
        </Card>
      </AdminPage>
    );
  }

  if (!letter) {
    return (
      <AdminPage title="Detail Teguran" backHref="/teguran">
        <Card>
          <CardContent className="p-6">Surat tidak ditemukan.</CardContent>
        </Card>
      </AdminPage>
    );
  }

  const preview = getLetterPreview(letter);
  const isSp = letter.type === "PERINGATAN";
  const canEditEvidence =
    letter.status === "DRAFT" || letter.status === "WAITING_APPROVAL";
  const hasEvidence = (letter.evidence || []).length > 0;
  const employeeValid = isFormalEmployeeId(letter.employee_id);
  const spApproved =
    letter.status === "APPROVED" ||
    letter.status === "SENT" ||
    letter.status === "ACKNOWLEDGED" ||
    letter.status === "RESOLVED";
  const canGeneratePdf = !isSp || spApproved;
  const canSend =
    employeeValid &&
    hasEvidence &&
    (!isSp || (letter.status === "APPROVED" && Boolean(letter.pdf_url)));
  const canApproveSp =
    isAdmin && isSp && letter.status === "WAITING_APPROVAL";

  return (
    <AdminPage title="Detail Teguran / SP" backHref="/teguran" maxWidth="2xl">
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-mono text-xs text-muted-foreground">
                {letter.letter_number}
              </p>
              <h2 className="text-lg font-semibold">{letter.title}</h2>
            </div>
            <Badge variant="secondary">{letter.status}</Badge>
          </div>
          <p className="text-sm">
            {isSp ? "SP" : "ST"} {letter.level} · {letter.employee_name_snapshot}{" "}
            · {letter.outlet_name_snapshot}
          </p>
          <p className="text-sm text-muted-foreground">
            Jabatan: {letter.employee_position_snapshot || "-"} · Kejadian:{" "}
            {letter.incident_date}
          </p>
          {letter.related_task_id ? (
            <p className="text-sm">
              Task:{" "}
              <Link
                className="text-primary underline"
                href={`/tasks/${letter.related_task_id}`}
              >
                {letter.related_task_id}
              </Link>
            </p>
          ) : null}
        </CardContent>
      </Card>

      {!employeeValid ? (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-950">
            Karyawan belum valid. Edit draft dan pilih karyawan dari daftar
            sebelum kirim / approval formal.
          </CardContent>
        </Card>
      ) : null}

      {letter.source_type === "FAKE_REPORT" ? (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-4 text-sm text-red-900">
            Kasus laporan/foto tidak valid termasuk pelanggaran integritas.
            Pastikan bukti lengkap sebelum diproses sebagai SP.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="space-y-3 p-4 text-sm">
          <div>
            <p className="font-medium">Kronologi</p>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {letter.chronology}
            </p>
          </div>
          <div>
            <p className="font-medium">Detail kesalahan</p>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {letter.violation_detail}
            </p>
          </div>
          <div>
            <p className="font-medium">Instruksi perbaikan</p>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {letter.correction_instruction}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <h3 className="font-semibold">Bukti</h3>
          {!hasEvidence ? (
            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Bukti belum lengkap. Draft boleh disimpan; kirim surat wajib ada
              bukti.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {(letter.evidence || []).map((e) => (
                <li key={e.id} className="rounded border p-2">
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
          {canEditEvidence ? (
            <PhotoUploader
              label="Tambah foto bukti (kamera / galeri)"
              size="large"
              upload={{
                taskId: letter.related_task_id || `teguran-${letter.id}`,
                context: "disciplinary",
              }}
              onChange={(url) => {
                if (url) void appendEvidencePhoto(url);
              }}
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-4">
          <h3 className="font-semibold">Preview isi surat</h3>
          <pre className="whitespace-pre-wrap rounded bg-muted/50 p-3 text-xs leading-relaxed">
            {preview}
          </pre>
          {letter.pdf_url ? (
            <a
              href={letter.pdf_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary underline"
            >
              {letter.pdf_storage === "supabase"
                ? "Buka arsip surat (cloud) — cetak / Save as PDF"
                : "Buka preview surat (sementara — cetak / Save as PDF)"}
            </a>
          ) : null}
          {letter.pdf_storage === "supabase" ? (
            <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-950">
              Arsip tersimpan di Supabase Storage (permanen). Format file HTML
              resmi — gunakan Print browser untuk Save as PDF bila perlu.
            </p>
          ) : (
            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              {letter.pdf_url
                ? "Preview masih sementara. Belum arsip cloud — pastikan NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY terpasang, lalu generate ulang."
                : "Belum ada arsip. Klik “Arsipkan Surat ke Cloud” untuk menyimpan ke Supabase."}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-4">
          <h3 className="font-semibold">Audit log</h3>
          <ul className="space-y-2 text-sm">
            {(letter.events || []).map((ev) => (
              <li key={ev.id} className="rounded border p-2">
                <p className="font-medium">
                  {ev.action}
                  {ev.previous_status || ev.new_status
                    ? ` (${ev.previous_status || "-"} → ${ev.new_status || "-"})`
                    : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ev.actor_name_snapshot} ·{" "}
                  {new Date(ev.created_at).toLocaleString("id-ID")}
                </p>
                {ev.note ? <p className="text-xs">{ev.note}</p> : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {(letter.status === "DRAFT" || letter.status === "WAITING_APPROVAL") && (
          <Link href={`/teguran/new?edit=${letter.id}`}>
            <Button variant="outline" className="w-full">
              Edit Draft
            </Button>
          </Link>
        )}
        {letter.status === "DRAFT" && isSp && (
          <Button
            disabled={pending || !employeeValid || !hasEvidence}
            onClick={() => act("submit_approval", "Diajukan approval")}
          >
            Ajukan Approval SP
          </Button>
        )}
        {canApproveSp ? (
          <Button
            disabled={pending}
            onClick={() => act("approve", "SP disetujui")}
          >
            Approve SP
          </Button>
        ) : null}
        {isSp && letter.status === "WAITING_APPROVAL" && !isAdmin ? (
          <p className="col-span-full text-xs text-muted-foreground">
            Menunggu approval Admin/Owner. Leader tidak bisa approve SP.
          </p>
        ) : null}
        <div className="space-y-1">
          <Button
            variant="secondary"
            className="w-full"
            disabled={pending || !canGeneratePdf}
            onClick={() => act("generate_pdf", "Surat diarsipkan")}
          >
            Arsipkan Surat ke Cloud
          </Button>
          {!canGeneratePdf ? (
            <p className="text-xs text-amber-800">
              SP belum di-approve. Arsip formal belum boleh dibuat.
            </p>
          ) : letter.pdf_storage === "supabase" ? (
            <p className="text-xs text-emerald-800">
              Sudah ada arsip cloud. Klik lagi untuk regenerate/overwrite.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Simpan HTML resmi ke Supabase Storage (bukan lewat GAS).
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Button
            className="w-full"
            disabled={pending || !canSend}
            onClick={() =>
              act("send", "Ditandai terkirim di sistem (bukan WA/email)")
            }
          >
            Kirim Surat
          </Button>
          <p className="text-xs text-muted-foreground">
            Menandai surat sebagai terkirim di sistem. Belum mengirim WA/email.
          </p>
          {!hasEvidence ? (
            <p className="text-xs text-amber-800">
              Tambahkan bukti dulu sebelum menandai terkirim.
            </p>
          ) : null}
          {!employeeValid ? (
            <p className="text-xs text-amber-800">
              Pilih karyawan valid dulu sebelum menandai terkirim.
            </p>
          ) : null}
          {isSp && letter.status !== "APPROVED" ? (
            <p className="text-xs text-amber-800">
              SP harus di-approve Admin/Owner dulu.
            </p>
          ) : null}
        </div>
        {letter.status === "SENT" && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => act("acknowledge", "Ditandai dibaca")}
          >
            Tandai Dibaca
          </Button>
        )}
        {(letter.status === "SENT" || letter.status === "ACKNOWLEDGED") && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => act("resolve", "Diselesaikan")}
          >
            Selesaikan
          </Button>
        )}
        {letter.status !== "CANCELLED" && letter.status !== "RESOLVED" && (
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => act("cancel", "Dibatalkan")}
          >
            Batalkan
          </Button>
        )}
      </div>
    </AdminPage>
  );
}

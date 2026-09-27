"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type {
  DisciplinaryEvidenceInput,
  DisciplinaryLetter,
  DisciplinaryNotifyResult,
} from "@nusafood/types";
import { AdminPage } from "@/components/admin-page";
import { PhotoUploader } from "@/components/photo-uploader";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Check, ExternalLink, FileText, Loader2, Pencil } from "lucide-react";
import {
  formatTanggal,
  formatTanggalJam,
  outletLabel,
  presentChronology,
  presentViolation,
  romanLevel,
  tidySentence,
} from "@/lib/letter/letter-format";
import { getLetterPreview } from "@/lib/services/disciplinary-preview";

type ApiResponse<T> =
  | { success: true; data: T; error: null; notify?: DisciplinaryNotifyResult }
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
  const [waNotify, setWaNotify] = useState<DisciplinaryNotifyResult | null>(
    null,
  );
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

  function handleWaNotify(notify: DisciplinaryNotifyResult) {
    setWaNotify(notify);
    if (notify.gas_sent) {
      toast({
        title: "WhatsApp terkirim",
        description: `Pesan dikirim ke ${notify.employee_wa || "karyawan"}.`,
      });
      return;
    }
    if (notify.wa_link) {
      window.open(notify.wa_link, "_blank", "noopener,noreferrer");
      toast({
        title: "Buka WhatsApp untuk kirim surat",
        description:
          "WA otomatis via GAS belum tersedia. WhatsApp dibuka — tekan Kirim di aplikasi WA.",
      });
      return;
    }
    toast({
      title: "WA gagal",
      description:
        notify.gas_error === "NO_EMPLOYEE_WA"
          ? "Nomor WA karyawan tidak ditemukan di data staff."
          : notify.gas_error || "Tidak bisa mengirim WhatsApp.",
      variant: "destructive",
    });
  }

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
      if (
        (action === "send" || action === "resend_wa") &&
        json.notify
      ) {
        handleWaNotify(json.notify);
        return;
      }
      toast({ title: successTitle });
      if (action === "generate_pdf" && json.data.pdf_url) {
        window.open(json.data.pdf_url, "_blank", "noopener,noreferrer");
      }
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
      <AdminPage title="Detail Surat" backHref="/teguran" maxWidth="2xl">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Memuat…
        </p>
      </AdminPage>
    );
  }

  if (!letter) {
    return (
      <AdminPage title="Detail Surat" backHref="/teguran" maxWidth="2xl">
        <p className="rounded-xl border p-6 text-sm text-muted-foreground">
          Surat tidak ditemukan.
        </p>
      </AdminPage>
    );
  }

  const isSp = letter.type === "PERINGATAN";
  const docLabel = `${isSp ? "Surat Peringatan" : "Surat Teguran"} ${romanLevel(letter.level)}`;
  const canEditEvidence =
    letter.status === "DRAFT" || letter.status === "WAITING_APPROVAL";
  const hasEvidence = (letter.evidence || []).length > 0;
  const employeeValid = isFormalEmployeeId(letter.employee_id);
  const canSend =
    employeeValid &&
    hasEvidence &&
    (!isSp || (letter.status === "APPROVED" && Boolean(letter.pdf_url)));
  const canApproveSp = isAdmin && isSp && letter.status === "WAITING_APPROVAL";
  const statusInfo = STATUS_LABEL[letter.status] ?? { label: letter.status, tone: "slate" };
  const steps = isSp
    ? ["DRAFT", "WAITING_APPROVAL", "APPROVED", "SENT", "ACKNOWLEDGED", "RESOLVED"]
    : ["DRAFT", "SENT", "ACKNOWLEDGED", "RESOLVED"];
  const currentStep = steps.indexOf(letter.status);

  // Syarat sebelum surat bisa dikirim — ditampilkan sebagai checklist, bukan deretan pesan.
  const sendChecks = [
    { ok: employeeValid, label: "Karyawan dipilih dari daftar" },
    { ok: hasEvidence, label: "Minimal satu bukti" },
    ...(isSp ? [{ ok: letter.status === "APPROVED" || letter.status === "SENT", label: "Disetujui Admin/Owner" }] : []),
  ];

  let primary: React.ReactNode = null;
  let primaryHint: string | null = null;
  if (letter.status === "DRAFT" && isSp) {
    primary = (
      <Button className="w-full" disabled={pending || !employeeValid || !hasEvidence} onClick={() => act("submit_approval", "Diajukan untuk approval")}>
        Ajukan Approval
      </Button>
    );
    primaryHint = "SP perlu disetujui Admin/Owner sebelum dikirim.";
  } else if (letter.status === "WAITING_APPROVAL") {
    primary = canApproveSp ? (
      <Button className="w-full" disabled={pending} onClick={() => act("approve", "SP disetujui")}>
        Setujui SP
      </Button>
    ) : null;
    primaryHint = canApproveSp ? null : "Menunggu persetujuan Admin/Owner.";
  } else if (letter.status === "APPROVED" && !letter.pdf_url) {
    primary = (
      <Button className="w-full" disabled={pending} onClick={() => act("generate_pdf", "Dokumen SP diterbitkan")}>
        Terbitkan Dokumen
      </Button>
    );
    primaryHint = "Menyiapkan dokumen resmi sebelum dikirim ke karyawan.";
  } else if (letter.status === "DRAFT" || letter.status === "APPROVED") {
    primary = (
      <Button className="w-full" disabled={pending || !canSend} onClick={() => act("send", "Surat terkirim")}>
        Kirim ke Karyawan (WhatsApp)
      </Button>
    );
  } else if (letter.status === "SENT") {
    primary = (
      <Button className="w-full" disabled={pending} onClick={() => act("acknowledge", "Ditandai sudah dibaca")}>
        Tandai Sudah Dibaca
      </Button>
    );
    primaryHint = "Tandai setelah karyawan membaca / menandatangani surat.";
  } else if (letter.status === "ACKNOWLEDGED") {
    primary = (
      <Button className="w-full" disabled={pending} onClick={() => act("resolve", "Kasus diselesaikan")}>
        Selesaikan Kasus
      </Button>
    );
    primaryHint = "Setelah perbaikan dilakukan sesuai instruksi.";
  }
  const showSendChecks =
    (letter.status === "DRAFT" || letter.status === "APPROVED") && sendChecks.some((c) => !c.ok);

  return (
    <AdminPage title="Detail Surat" backHref="/teguran" maxWidth="2xl">
      <div className="space-y-4">
        <section className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {docLabel}
              </p>
              <h1 className="truncate text-lg font-semibold">{letter.employee_name_snapshot}</h1>
              <p className="text-sm text-muted-foreground">
                {letter.employee_position_snapshot || "—"} · {outletLabel(letter.outlet_name_snapshot)}
              </p>
            </div>
            <StatusPill tone={statusInfo.tone}>{statusInfo.label}</StatusPill>
          </div>
          <dl className="grid grid-cols-[8.5rem_1fr] gap-y-1 text-sm">
            <dt className="text-muted-foreground">Nomor</dt>
            <dd className="font-medium">{letter.letter_number}</dd>
            <dt className="text-muted-foreground">Tanggal surat</dt>
            <dd>{formatTanggal(letter.incident_date)}</dd>
            {letter.correction_deadline ? (
              <>
                <dt className="text-muted-foreground">Batas perbaikan</dt>
                <dd>{formatTanggal(letter.correction_deadline)}</dd>
              </>
            ) : null}
            {letter.related_task_id ? (
              <>
                <dt className="text-muted-foreground">Tugas terkait</dt>
                <dd>
                  <Link className="text-primary underline" href={`/tasks/${letter.related_task_id}`}>
                    {letter.related_task_id}
                  </Link>
                </dd>
              </>
            ) : null}
          </dl>
          {letter.status !== "CANCELLED" && currentStep >= 0 ? (
            <ol className="flex items-center gap-1 pt-1">
              {steps.map((st, idx) => (
                <li key={st} className="flex flex-1 flex-col items-center gap-1 text-center">
                  <span
                    className={`h-1.5 w-full rounded-full ${idx <= currentStep ? "bg-primary" : "bg-muted"}`}
                  />
                  <span className={`text-[10px] leading-tight ${idx === currentStep ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    {STEP_LABEL[st]}
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
        </section>

        {letter.source_type === "FAKE_REPORT" ? (
          <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
            Kasus laporan/foto tidak valid termasuk pelanggaran integritas. Pastikan bukti lengkap sebelum diproses sebagai SP.
          </p>
        ) : null}

        {letter.status !== "CANCELLED" && letter.status !== "RESOLVED" ? (
          <section className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <h2 className="font-semibold">Langkah berikutnya</h2>
            {showSendChecks ? (
              <ul className="space-y-1 text-sm">
                {sendChecks.map((c) => (
                  <li key={c.label} className={`flex items-center gap-2 ${c.ok ? "text-muted-foreground" : "text-amber-800"}`}>
                    <Check className={`size-4 ${c.ok ? "text-emerald-600" : "opacity-30"}`} />
                    {c.label}
                  </li>
                ))}
              </ul>
            ) : null}
            {primary}
            {primaryHint ? <p className="text-xs text-muted-foreground">{primaryHint}</p> : null}
            {waNotify?.wa_link ? (
              <a href={waNotify.wa_link} target="_blank" rel="noreferrer" className="inline-flex text-sm font-medium text-primary underline">
                Buka WhatsApp ke {waNotify.employee_wa}
              </a>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <a href={`/api/disciplinary/${letter.id}/document`} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm">
                  <FileText className="mr-1.5 size-4" />
                  Lihat / Cetak Surat
                </Button>
              </a>
              {letter.status === "DRAFT" || letter.status === "WAITING_APPROVAL" ? (
                <Link href={`/teguran/new?edit=${letter.id}`}>
                  <Button variant="outline" size="sm">
                    <Pencil className="mr-1.5 size-4" />
                    Edit
                  </Button>
                </Link>
              ) : null}
              {letter.status === "SENT" ? (
                <Button variant="outline" size="sm" disabled={pending} onClick={() => act("resend_wa", "WhatsApp dikirim ulang")}>
                  Kirim Ulang WA
                </Button>
              ) : null}
              {letter.status === "SENT" ? (
                <Button variant="outline" size="sm" disabled={pending} onClick={() => act("resolve", "Kasus diselesaikan")}>
                  Selesaikan
                </Button>
              ) : null}
            </div>
          </section>
        ) : (
          <a href={`/api/disciplinary/${letter.id}/document`} target="_blank" rel="noreferrer">
            <Button variant="outline" className="w-full">
              <FileText className="mr-1.5 size-4" />
              Lihat / Cetak Surat
            </Button>
          </a>
        )}

        <section className="space-y-3 rounded-xl border bg-card p-4 text-sm">
          <h2 className="font-semibold">Isi surat</h2>
          <InfoBlock label="Kronologi" text={presentChronology(letter.chronology)} />
          <InfoBlock label="Bentuk pelanggaran" text={presentViolation(letter.violation_detail)} />
          {letter.operational_impact ? (
            <InfoBlock label="Dampak operasional" text={tidySentence(letter.operational_impact)} />
          ) : null}
          <InfoBlock label="Instruksi perbaikan" text={tidySentence(letter.correction_instruction)} />
          {letter.internal_note ? (
            <InfoBlock label="Catatan internal (tidak dicetak)" text={letter.internal_note} />
          ) : null}
        </section>

        <section className="space-y-3 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Bukti pendukung</h2>
          {hasEvidence ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {(letter.evidence || []).map((e) => (
                <li key={e.id} className="flex items-start gap-3 rounded-lg border p-2 text-sm">
                  {e.file_url && e.evidence_type === "PHOTO" ? (
                    <a href={e.file_url} target="_blank" rel="noreferrer" className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={e.file_url} alt="Bukti" className="size-16 rounded object-cover" />
                    </a>
                  ) : (
                    <span className="flex size-16 shrink-0 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                      {EVIDENCE_LABEL[e.evidence_type] ?? "Bukti"}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium">{EVIDENCE_LABEL[e.evidence_type] ?? "Bukti"}</p>
                    {e.text_note ? <p className="text-muted-foreground">{e.text_note}</p> : null}
                    {e.file_url && e.evidence_type !== "PHOTO" ? (
                      <a href={e.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline">
                        Buka <ExternalLink className="size-3" />
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
              Belum ada bukti — wajib ada sebelum surat dikirim.
            </p>
          )}
          {canEditEvidence ? (
            <PhotoUploader
              label="Tambah foto bukti"
              upload={{
                taskId: letter.related_task_id || `teguran-${letter.id}`,
                context: "disciplinary",
              }}
              onChange={(url) => {
                if (url) void appendEvidencePhoto(url);
              }}
            />
          ) : null}
        </section>

        <details className="rounded-xl border bg-card p-4 text-sm">
          <summary className="cursor-pointer font-semibold">Pesan WhatsApp ke karyawan</summary>
          <pre className="mt-3 whitespace-pre-wrap rounded bg-muted/50 p-3 text-xs leading-relaxed">
            {getLetterPreview(letter)}
          </pre>
        </details>

        <details className="rounded-xl border bg-card p-4 text-sm">
          <summary className="cursor-pointer font-semibold">
            Riwayat ({(letter.events || []).length})
          </summary>
          <ol className="mt-3 space-y-2">
            {(letter.events || []).map((ev) => (
              <li key={ev.id} className="border-l-2 border-muted pl-3">
                <p className="font-medium">{EVENT_LABEL[ev.action] ?? ev.action}</p>
                <p className="text-xs text-muted-foreground">
                  {ev.actor_name_snapshot} · {formatTanggalJam(ev.created_at)}
                </p>
                {ev.note ? <p className="text-xs">{ev.note}</p> : null}
              </li>
            ))}
          </ol>
        </details>

        {letter.status !== "CANCELLED" && letter.status !== "RESOLVED" ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button type="button" className="w-full py-2 text-sm text-destructive hover:underline" disabled={pending}>
                Batalkan surat ini
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Batalkan surat?</AlertDialogTitle>
                <AlertDialogDescription>
                  {docLabel} untuk {letter.employee_name_snapshot} akan ditandai dibatalkan. Riwayat tetap tersimpan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Kembali</AlertDialogCancel>
                <AlertDialogAction onClick={() => act("cancel", "Surat dibatalkan")}>
                  Ya, batalkan
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>
    </AdminPage>
  );
}

const STATUS_LABEL: Record<string, { label: string; tone: "slate" | "amber" | "sky" | "emerald" | "red" }> = {
  DRAFT: { label: "Draft", tone: "slate" },
  WAITING_APPROVAL: { label: "Menunggu approval", tone: "amber" },
  APPROVED: { label: "Disetujui", tone: "sky" },
  SENT: { label: "Terkirim", tone: "sky" },
  ACKNOWLEDGED: { label: "Sudah dibaca", tone: "emerald" },
  RESOLVED: { label: "Selesai", tone: "emerald" },
  CANCELLED: { label: "Dibatalkan", tone: "red" },
};

const STEP_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  WAITING_APPROVAL: "Approval",
  APPROVED: "Disetujui",
  SENT: "Terkirim",
  ACKNOWLEDGED: "Dibaca",
  RESOLVED: "Selesai",
};

const EVENT_LABEL: Record<string, string> = {
  CREATED: "Draft dibuat",
  UPDATED: "Draft diubah",
  SUBMIT_APPROVAL: "Diajukan untuk approval",
  APPROVED: "Disetujui",
  PDF_GENERATED: "Dokumen diterbitkan",
  SENT: "Dikirim ke karyawan",
  WA_RESEND: "WhatsApp dikirim ulang",
  ACKNOWLEDGED: "Ditandai sudah dibaca",
  RESOLVED: "Kasus diselesaikan",
  CANCELLED: "Dibatalkan",
};

const EVIDENCE_LABEL: Record<string, string> = {
  PHOTO: "Foto",
  SCREENSHOT: "Screenshot",
  TASK_REPORT: "Laporan tugas",
  NOTE: "Catatan",
  FILE: "File",
  LINK: "Laporan tugas",
};

function StatusPill({ tone, children }: { tone: "slate" | "amber" | "sky" | "emerald" | "red"; children: React.ReactNode }) {
  const cls = {
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-100 text-amber-800",
    sky: "bg-sky-100 text-sky-800",
    emerald: "bg-emerald-100 text-emerald-800",
    red: "bg-red-100 text-red-700",
  }[tone];
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{children}</span>;
}

function InfoBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap">{text}</p>
    </div>
  );
}

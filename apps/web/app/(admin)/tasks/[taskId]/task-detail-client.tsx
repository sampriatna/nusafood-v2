"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Task } from "@nusafood/types";
import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  MapPin,
  MessageSquare,
  RotateCcw,
  Send,
  Trash2,
  User,
} from "lucide-react";
import { MobileHeader } from "@/components/mobile-header";
import { StatusBadge } from "@/components/status-badge";
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  formatDateId,
  formatDateTimeId,
  formatTimeId,
} from "@/lib/format-datetime";

type Props = {
  task: Task;
  canDelete?: boolean;
};

type TimelineEvent = {
  label: string;
  time: string | null | undefined;
  icon: React.ReactNode;
  completed: boolean;
};

export function TaskDetailClient({
  task: initialTask,
  canDelete = false,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [task, setTask] = useState(initialTask);
  const [pending, startTransition] = useTransition();
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");

  useEffect(() => {
    setTask(initialTask);
  }, [initialTask]);

  const deadlineDate = useMemo(() => new Date(task.deadline), [task.deadline]);
  const openStatuses = ["CREATED", "SENT", "OPEN", "OPENED", "WA_FAILED", "LATE"];
  const isOverdue =
    Date.now() > deadlineDate.getTime() && openStatuses.includes(task.status);

  const canApprove = [
    "SUBMITTED",
    "RESUBMITTED",
    "WAITING_VERIFICATION",
  ].includes(task.status);
  const canResendWA = ["OPEN", "REVISI", "CREATED", "SENT", "WA_FAILED", "LATE", "OPENED"].includes(
    task.status,
  );
  const canRemind = openStatuses.includes(task.status);

  const showBeforePhoto = Boolean(task.before_photo_url);
  const showAfterPhoto =
    Boolean(task.after_photo_url) ||
    ["SUBMITTED", "RESUBMITTED", "WAITING_VERIFICATION", "DONE", "VERIFIED"].includes(
      task.status,
    );
  const showPhotoSection = showBeforePhoto || showAfterPhoto;

  const timeline: TimelineEvent[] = [
    {
      label: "Dibuat",
      time: task.created_at,
      icon: <Calendar className="size-4" />,
      completed: true,
    },
    {
      label: "WA Dikirim",
      time: task.wa_sent_at || null,
      icon: <Send className="size-4" />,
      completed: !!task.wa_sent_at,
    },
    {
      label: "Dibuka",
      time: task.opened_at || null,
      icon: <Clock className="size-4" />,
      completed: !!task.opened_at,
    },
    {
      label: "Laporan Dikirim",
      time: task.submitted_at || null,
      icon: <ImageIcon className="size-4" />,
      completed: !!task.submitted_at,
    },
    {
      label: "Diverifikasi",
      time: task.verified_at || null,
      icon: <CheckCircle2 className="size-4" />,
      completed: !!task.verified_at,
    },
  ];

  async function postAction(
    path: string,
    body?: object,
  ): Promise<{ success: boolean; error?: string; data?: Task }> {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json()) as {
      success: boolean;
      error?: string;
      data?: Task;
    };
    return json;
  }

  function refreshFromServer() {
    router.refresh();
  }

  function handleApprove() {
    startTransition(async () => {
      const result = await postAction(`/api/tasks/${task.task_id}/verify`, {
        note: undefined,
      });
      if (!result.success) {
        toast({
          title: "Gagal menyetujui",
          description: result.error || "Terjadi kesalahan",
          variant: "destructive",
        });
        return;
      }
      if (result.data) setTask(result.data);
      toast({
        title: "Tugas Disetujui",
        description: "Status tugas telah diperbarui menjadi DONE",
      });
      refreshFromServer();
    });
  }

  function handleRevision() {
    if (!revisionNote.trim()) {
      toast({
        title: "Catatan diperlukan",
        description: "Harap isi alasan revisi",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      const result = await postAction(`/api/tasks/${task.task_id}/revision`, {
        revision_note: revisionNote.trim(),
      });
      if (!result.success) {
        toast({
          title: "Gagal mengirim revisi",
          description: result.error || "Terjadi kesalahan",
          variant: "destructive",
        });
        return;
      }
      if (result.data) setTask(result.data);
      toast({
        title: "Permintaan Revisi Dikirim",
        description: "Staff akan menerima notifikasi untuk revisi",
      });
      setShowRevisionDialog(false);
      setRevisionNote("");
      refreshFromServer();
    });
  }

  function handleResendWA() {
    const path = task.checklist_mode
      ? `/api/checklist-reports/${task.task_id}/resend-wa`
      : `/api/tasks/${task.task_id}/resend-wa`;

    startTransition(async () => {
      const result = await postAction(path);
      if (!result.success) {
        const raw = result.error || "Terjadi kesalahan";
        const friendly =
          raw.includes("ADMIN_SECRET") || raw.includes("GAS_")
            ? "Gagal kirim ulang WA. Cek konfigurasi GAS_WEB_APP_URL / ADMIN_API_KEY."
            : raw;
        toast({
          title: "Gagal mengirim ulang",
          description: friendly,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "WhatsApp Dikirim Ulang",
        description: "Notifikasi sedang diproses",
      });
      refreshFromServer();
    });
  }

  function handleDeleteTask() {
    startTransition(async () => {
      const res = await fetch(
        `/api/tasks/${encodeURIComponent(task.task_id)}`,
        { method: "DELETE", credentials: "include" },
      );
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
      };
      if (!res.ok || json.success === false) {
        toast({
          title: "Gagal menghapus tugas",
          description: json.error || "Coba lagi",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Tugas dihapus",
        description: task.task_id,
      });
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <MobileHeader title="Detail Tugas" showBack backHref="/dashboard" />

      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <Card className="p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="font-mono text-xs text-muted-foreground">
                {task.task_id}
              </span>
              <h1 className="mt-1 text-xl font-bold text-foreground">
                {task.task_title}
              </h1>
            </div>
            <StatusBadge status={task.status} />
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="size-4 shrink-0" />
              <span>
                {task.outlet} - {task.area} - {task.category}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="size-4 shrink-0" />
              <span>
                {task.pic_name} ({task.pic_wa})
              </span>
            </div>
            <div
              className={`flex items-center gap-2 ${
                isOverdue ? "font-medium text-red-600" : "text-muted-foreground"
              }`}
            >
              <Clock className="size-4 shrink-0" />
              <span>
                Deadline: {formatDateId(deadlineDate)}{" "}
                {formatTimeId(deadlineDate)} WIB
              </span>
            </div>
          </div>

          {task.task_description ? (
            <div className="mt-4 border-t border-border pt-4">
              <p className="mb-1 text-sm font-medium text-foreground">
                Deskripsi:
              </p>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {task.task_description}
              </p>
            </div>
          ) : null}

          {task.checklist_mode ? (
            <div className="mt-3 flex items-start gap-2 rounded-md bg-primary/5 p-3 text-xs text-muted-foreground">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                Mode checklist — approve/revisi memperbarui task dan checklist
                report bersamaan.
              </span>
            </div>
          ) : null}
        </Card>

        {showPhotoSection ? (
          <div
            className={
              showBeforePhoto && showAfterPhoto
                ? "grid grid-cols-2 gap-3"
                : "grid grid-cols-1 gap-3"
            }
          >
            {showBeforePhoto ? (
              <Card className="p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Foto Before
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={task.before_photo_url}
                  alt="Before"
                  className="aspect-video w-full rounded-lg object-cover"
                />
              </Card>
            ) : null}

            {showAfterPhoto ? (
              <Card className="p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Foto After
                </p>
                {task.after_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={task.after_photo_url}
                    alt="After"
                    className="aspect-video w-full rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-muted">
                    <span className="text-xs text-muted-foreground">
                      Belum ada foto
                    </span>
                  </div>
                )}
              </Card>
            ) : null}
          </div>
        ) : null}

        {task.staff_note ? (
          <Card className="p-4">
            <div className="flex items-start gap-2">
              <MessageSquare className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Catatan Staff:
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {task.staff_note}
                </p>
              </div>
            </div>
          </Card>
        ) : null}

        {task.leader_verification ? (
          <Card className="p-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Catatan Leader:
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {task.leader_verification}
                </p>
              </div>
            </div>
          </Card>
        ) : null}

        <Card className="p-4">
          <h3 className="mb-4 font-semibold text-foreground">Timeline</h3>
          <div className="space-y-3">
            {timeline.map((event) => (
              <div key={event.label} className="flex items-start gap-3">
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                    event.completed
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {event.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      event.completed
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {event.label}
                  </p>
                  {event.time ? (
                    <p className="text-xs text-muted-foreground">
                      {formatDateTimeId(event.time)} WIB
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {(canApprove || canResendWA || canRemind) && (
          <Card className="p-4">
            <h3 className="mb-3 font-semibold text-foreground">Aksi</h3>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {canApprove ? (
                  <>
                    <Button
                      onClick={handleApprove}
                      disabled={pending}
                      className="flex-1"
                    >
                      <CheckCircle2 className="mr-2 size-4" />
                      Setujui
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowRevisionDialog(true)}
                      disabled={pending}
                      className="flex-1"
                    >
                      <RotateCcw className="mr-2 size-4" />
                      Minta Revisi
                    </Button>
                  </>
                ) : null}
                {canResendWA ? (
                  <Button
                    variant="secondary"
                    onClick={handleResendWA}
                    disabled={pending}
                    className="w-full sm:w-auto"
                  >
                    <Send className="mr-2 size-4" />
                    Kirim Ulang WA
                  </Button>
                ) : null}
                {canRemind ? (
                  <Link
                    href={`/teguran/new?task_id=${encodeURIComponent(task.task_id)}`}
                    className="w-full sm:w-auto"
                  >
                    <Button
                      variant="outline"
                      disabled={pending}
                      className="w-full sm:w-auto"
                    >
                      <Bell className="mr-2 size-4" />
                      Buat Draft Teguran
                    </Button>
                  </Link>
                ) : null}
              </div>
            </div>
          </Card>
        )}

        {canDelete ? (
          <Card className="border-destructive/20 p-4">
            <h3 className="mb-2 font-semibold text-destructive">Zona bahaya</h3>
            <p className="mb-3 text-sm text-muted-foreground">
              Hapus tugas dari daftar v2. Link laporan staff tidak lagi aktif.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={pending}>
                  <Trash2 className="mr-2 size-4" />
                  Hapus Tugas
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus tugas ini?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {task.task_id} — {task.task_title} akan dihapus permanen
                    dari database v2.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleDeleteTask}
                  >
                    Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Card>
        ) : null}

        {task.report_link ? (
          <p className="break-all px-1 font-mono text-xs text-muted-foreground">
            Link laporan:{" "}
            <a href={task.report_link} className="hover:underline">
              {task.report_link}
            </a>
          </p>
        ) : null}
      </div>

      <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Minta Revisi</DialogTitle>
            <DialogDescription>
              Berikan catatan untuk staff tentang apa yang perlu diperbaiki.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Tuliskan alasan revisi..."
            value={revisionNote}
            onChange={(e) => setRevisionNote(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRevisionDialog(false)}
            >
              Batal
            </Button>
            <Button onClick={handleRevision} disabled={pending}>
              {pending ? "Mengirim..." : "Kirim Revisi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

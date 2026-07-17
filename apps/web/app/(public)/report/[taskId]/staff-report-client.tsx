"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Image as ImageIcon,
  Send,
} from "lucide-react";
import { PhotoUploader } from "@/components/photo-uploader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Task } from "@nusafood/types";

type PageState = "loading" | "error" | "form" | "submitting" | "success";

type Props = {
  taskId: string;
  token: string;
};

export function StaffReportClient({ taskId, token }: Props) {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [task, setTask] = useState<Task | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [afterPhotoUrl, setAfterPhotoUrl] = useState<string | undefined>();
  const [staffNote, setStaffNote] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    void loadTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, token]);

  async function loadTask() {
    if (!taskId || !token) {
      setErrorMessage("Link tidak valid.\nHubungi atasan Anda.");
      setPageState("error");
      return;
    }

    setPageState("loading");
    try {
      const res = await fetch(
        `/api/tasks/${encodeURIComponent(taskId)}/public?token=${encodeURIComponent(token)}`,
      );
      const json = (await res.json()) as {
        success: boolean;
        data?: Task;
        error?: string;
      };

      if (!json.success || !json.data) {
        setErrorMessage(json.error || "Link tidak valid.\nHubungi atasan Anda.");
        setPageState("error");
        return;
      }

      setTask(json.data);

      if (["SUBMITTED", "RESUBMITTED", "WAITING_VERIFICATION", "DONE", "VERIFIED"].includes(json.data.status)) {
        setPageState("success");
        return;
      }

      setPageState("form");
      await fetch(`/api/tasks/${encodeURIComponent(taskId)}/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
    } catch {
      setErrorMessage("Gagal memuat tugas.\nPeriksa koneksi internet Anda.");
      setPageState("error");
    }
  }

  async function handleSubmit() {
    if (!afterPhotoUrl) {
      alert("HARAP UPLOAD FOTO BUKTI SELESAI");
      return;
    }

    setPageState("submitting");
    try {
      const res = await fetch(
        `/api/tasks/${encodeURIComponent(taskId)}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            after_photo_url: afterPhotoUrl,
            staff_note: staffNote || undefined,
          }),
        },
      );
      const json = (await res.json()) as { success: boolean; error?: string };
      if (json.success) {
        setPageState("success");
      } else {
        setPageState("form");
        alert(json.error || "Gagal mengirim. Coba lagi.");
      }
    } catch {
      setPageState("form");
      alert("Gagal mengirim. Periksa koneksi internet.");
    }
  }

  if (pageState === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-6 text-xl font-medium">Memuat Tugas...</p>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="mt-6 text-center text-2xl font-bold">
          Tugas Tidak Ditemukan
        </h1>
        <p className="mt-3 whitespace-pre-line text-center text-lg text-muted-foreground">
          {errorMessage}
        </p>
        <Button onClick={() => void loadTask()} variant="outline" size="lg" className="mt-8 h-14 px-8 text-lg">
          Coba Lagi
        </Button>
      </div>
    );
  }

  if (pageState === "submitting") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <div className="h-20 w-20 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-8 text-2xl font-bold">Mengirim Laporan...</p>
        <p className="mt-3 text-center text-lg text-muted-foreground">
          Harap tunggu, jangan tutup halaman ini
        </p>
      </div>
    );
  }

  if (pageState === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-success/5 p-6">
        <div className="flex h-28 w-28 animate-bounce items-center justify-center rounded-full bg-success/20">
          <CheckCircle2 className="h-16 w-16 text-success" />
        </div>
        <h1 className="mt-8 text-center text-3xl font-bold">BERHASIL!</h1>
        <p className="mt-4 text-center text-xl text-muted-foreground">
          Laporan Anda sudah terkirim
        </p>
        <div className="mt-8 rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-muted-foreground">
            Atasan Anda akan memeriksa laporan ini.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Anda bisa menutup halaman ini.
          </p>
        </div>
      </div>
    );
  }

  const deadlineDate = task ? new Date(task.deadline) : new Date();
  const now = new Date();
  const isOverdue = now > deadlineDate;
  const timeDiff = deadlineDate.getTime() - now.getTime();
  const hoursRemaining = Math.floor(timeDiff / (1000 * 60 * 60));
  const minutesRemaining = Math.floor(
    (timeDiff % (1000 * 60 * 60)) / (1000 * 60),
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="shrink-0 bg-primary p-4 text-center text-primary-foreground">
        <h1 className="text-lg font-bold">LAPORAN TUGAS</h1>
      </header>

      <div
        className={`p-4 ${
          isOverdue
            ? "border-b-2 border-destructive bg-destructive/10"
            : "border-b-2 border-warning bg-warning/10"
        }`}
      >
        <div className="flex items-center justify-center gap-3">
          <Clock
            className={`h-6 w-6 ${isOverdue ? "text-destructive" : "text-warning-foreground"}`}
          />
          <div className="text-center">
            {isOverdue ? (
              <>
                <p className="text-lg font-bold text-destructive">TERLAMBAT!</p>
                <p className="text-sm text-destructive/80">
                  Segera selesaikan tugas ini
                </p>
              </>
            ) : (
              <>
                <p className="text-base font-bold text-warning-foreground">
                  Deadline:{" "}
                  {deadlineDate.toLocaleDateString("id-ID", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  {deadlineDate.toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-sm text-warning-foreground/80">
                  Sisa waktu:{" "}
                  {hoursRemaining > 0 ? `${hoursRemaining} jam ` : ""}
                  {minutesRemaining} menit
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-lg space-y-5 p-4 pb-32">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-1 font-mono text-xs text-muted-foreground">
              {task?.task_id}
            </p>
            <h2 className="text-xl font-bold leading-tight">
              {task?.task_title}
            </h2>
            <p className="mt-2 text-base text-muted-foreground">
              {task?.outlet} - {task?.area}
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="flex w-full items-center justify-between p-4 text-left"
            >
              <span className="font-semibold">Lihat Instruksi Tugas</span>
              {showDetails ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
            {showDetails ? (
              <div className="space-y-4 border-t border-border px-4 pb-4 pt-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    INSTRUKSI:
                  </p>
                  <p className="whitespace-pre-wrap text-base leading-relaxed">
                    {task?.task_description || "—"}
                  </p>
                </div>
                {task?.before_photo_url ? (
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <ImageIcon className="h-4 w-4" />
                      FOTO SEBELUM:
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={task.before_photo_url}
                      alt="Foto sebelum"
                      className="w-full rounded-lg border border-border"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <PhotoUploader
              label="UPLOAD FOTO BUKTI SELESAI"
              required
              value={afterPhotoUrl}
              onChange={setAfterPhotoUrl}
              size="large"
              upload={{ taskId, token, context: "after" }}
            />
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Catatan (tidak wajib)
            </label>
            <Textarea
              placeholder="Tulis catatan jika ada..."
              value={staffNote}
              onChange={(e) => setStaffNote(e.target.value)}
              rows={2}
              className="text-base"
            />
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t-2 border-border bg-background p-4 shadow-lg">
        <div className="mx-auto max-w-lg">
          <Button
            onClick={() => void handleSubmit()}
            disabled={!afterPhotoUrl}
            size="lg"
            className={`h-16 w-full text-xl font-bold transition-all ${
              afterPhotoUrl
                ? "bg-success text-success-foreground hover:bg-success/90"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Send className="mr-3 h-6 w-6" />
            {afterPhotoUrl ? "KIRIM LAPORAN" : "UPLOAD FOTO DULU"}
          </Button>
          {!afterPhotoUrl ? (
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Ambil foto bukti selesai untuk mengirim laporan
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

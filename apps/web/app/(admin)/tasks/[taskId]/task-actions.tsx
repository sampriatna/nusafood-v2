"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  taskId: string;
  status: string;
  checklistMode?: boolean;
};

export function TaskActions({ taskId, status, checklistMode }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function run(path: string, body?: object) {
    setMessage(null);
    startTransition(async () => {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!json.success) {
        setMessage(json.error || "Aksi gagal");
        return;
      }
      setMessage("Berhasil");
      router.refresh();
    });
  }

  const canVerify = ["SUBMITTED", "RESUBMITTED", "WAITING_VERIFICATION"].includes(
    status,
  );

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <p className="text-sm font-medium">Aksi leader</p>
      <Input
        placeholder="Catatan verifikasi / revisi"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {checklistMode ? (
        <p className="text-xs text-muted-foreground">
          Checklist — approve/revisi memperbarui task dan checklist report
          bersamaan.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending || !canVerify}
          onClick={() =>
            run(`/api/tasks/${taskId}/verify`, { note: note || undefined })
          }
        >
          Setujui
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending || !note.trim()}
          onClick={() =>
            run(`/api/tasks/${taskId}/revision`, { revision_note: note })
          }
        >
          Minta revisi
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => run(`/api/tasks/${taskId}/resend-wa`)}
        >
          Resend WA
        </Button>
      </div>
      {message ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}

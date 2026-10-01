"use client";

import { outletShortName } from "@/lib/outlet-codes";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Task } from "@nusafood/types";
import { Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTimeId } from "@/lib/format-datetime";
import { getPositionGroupLabel } from "@/lib/position-groups";

type PicOption = { staff_id: string; name: string; wa_number: string; scheduled: boolean };

type PendingTask = Task & {
  wa_link: string;
  wa_share_link: string;
  pic_position?: string;
  pic_options?: PicOption[];
};

type Props = {
  /** Dipanggil kalau auto-generate membuat tugas baru, supaya daftar dashboard ikut refresh. */
  onGenerated?: () => void;
};

const AUTO_GENERATE_KEY = "nf3:auto-generate-at";
const AUTO_GENERATE_EVERY_MS = 3 * 60 * 1000;

function shouldAutoGenerate(): boolean {
  try {
    const last = Number(sessionStorage.getItem(AUTO_GENERATE_KEY) || 0);
    if (Date.now() - last < AUTO_GENERATE_EVERY_MS) return false;
    sessionStorage.setItem(AUTO_GENERATE_KEY, String(Date.now()));
  } catch {
    // storage diblokir → tetap jalan; server punya cooldown sendiri
  }
  return true;
}

/**
 * Kotak "Siap Dikirim": tugas (termasuk tugas berulang yang dibuat otomatis)
 * yang belum dikirim ke PIC. Kirim = buka wa.me, lalu ditandai terkirim.
 */
export function PendingSendPanel({ onGenerated }: Props) {
  const [tasks, setTasks] = useState<PendingTask[]>([]);
  const [reassigning, setReassigning] = useState<string | null>(null);
  const onGeneratedRef = useRef(onGenerated);
  onGeneratedRef.current = onGenerated;

  const loadPending = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks/pending-send", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const json = (await res.json()) as { success: boolean; data?: PendingTask[] };
      if (json.success && json.data) setTasks(json.data);
    } catch {
      // panel opsional — diam saja kalau gagal
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (shouldAutoGenerate()) {
        try {
          const res = await fetch("/api/recurring-templates/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ mode: "auto" }),
          });
          const json = (await res.json()) as {
            success: boolean;
            data?: { created?: number };
          };
          if (!cancelled && json.success && (json.data?.created ?? 0) > 0) {
            onGeneratedRef.current?.();
          }
        } catch {
          // cron pagi tetap jadi cadangan
        }
      }
      if (!cancelled) await loadPending();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadPending]);

  function markSent(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.task_id !== taskId));
    // keepalive: request tetap terkirim walau halaman pindah ke WhatsApp
    void fetch(`/api/tasks/${encodeURIComponent(taskId)}/mark-sent`, {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => undefined);
  }

  async function reassign(task: PendingTask, staffId: string) {
    if (!staffId || staffId === task.staff_id) return;
    setReassigning(task.task_id);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(task.task_id)}/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ staff_id: staffId }),
      });
      const json = (await res.json()) as { success: boolean; data?: PendingTask };
      if (json.success && json.data) {
        const updated = json.data;
        setTasks((prev) =>
          prev.map((t) =>
            t.task_id === task.task_id
              ? { ...updated, pic_position: t.pic_position, pic_options: t.pic_options }
              : t,
          ),
        );
      }
    } catch {
      // biarkan PIC lama; admin bisa coba lagi
    } finally {
      setReassigning(null);
    }
  }

  if (!tasks.length) return null;

  return (
    <Card className="gap-0 border-primary/40 py-0">
      <CardContent className="space-y-3 p-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Siap Dikirim ({tasks.length})
          </p>
          <p className="text-xs text-muted-foreground">
            Tugas yang belum dikirim ke PIC dan deadline-nya belum lewat. Tap
            Kirim WA, lalu tekan kirim di WhatsApp.
          </p>
        </div>
        <ul className="divide-y">
          {tasks.map((task) => (
            <li key={task.task_id} className="space-y-2 py-2.5 first:pt-0 last:pb-0">
              <Link href={`/tasks/${task.task_id}`} className="block min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {task.task_title}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {task.pic_name} · {outletShortName(String(task.outlet))} · deadline{" "}
                  {formatDateTimeId(task.deadline)}
                </p>
              </Link>
              {task.pic_position ? (
                <PicPicker
                  task={task}
                  busy={reassigning === task.task_id}
                  onChange={(staffId) => void reassign(task, staffId)}
                />
              ) : null}
              <div className="flex gap-2">
                {task.wa_link ? (
                  <Button asChild size="sm" className="flex-1">
                    <a
                      href={task.wa_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => markSent(task.task_id)}
                    >
                      <Send className="mr-1.5 size-4" />
                      Kirim WA
                    </a>
                  </Button>
                ) : (
                  <p className="flex-1 self-center text-xs text-destructive">
                    Nomor WA PIC tidak valid
                  </p>
                )}
                <Button asChild size="sm" variant="outline">
                  <a
                    href={task.wa_share_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => markSent(task.task_id)}
                  >
                    <Users className="mr-1.5 size-4" />
                    Grup
                  </a>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function PicPicker({
  task,
  busy,
  onChange,
}: {
  task: PendingTask;
  busy: boolean;
  onChange: (staffId: string) => void;
}) {
  const options = task.pic_options ?? [];
  const label = getPositionGroupLabel(task.pic_position ?? "");
  const current = options.find((o) => o.staff_id === task.staff_id);
  const note = !options.length
    ? `Tidak ada ${label} terjadwal — dipakai PIC cadangan.`
    : options.length > 1 && !current?.scheduled
      ? `Ada ${options.length} ${label}. Pastikan PIC-nya benar.`
      : null;

  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="shrink-0">PIC ({label}):</span>
        <select
          className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1.5 text-base text-foreground"
          value={task.staff_id ?? ""}
          disabled={busy}
          onChange={(e) => onChange(e.target.value)}
        >
          {!current ? <option value={task.staff_id ?? ""}>{task.pic_name}</option> : null}
          {options.map((o) => (
            <option key={o.staff_id} value={o.staff_id}>
              {o.name}
              {o.scheduled ? " · terjadwal" : ""}
            </option>
          ))}
        </select>
      </label>
      {note ? <p className="text-xs text-amber-600">{note}</p> : null}
    </div>
  );
}

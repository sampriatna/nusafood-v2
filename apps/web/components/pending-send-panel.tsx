"use client";

import { outletShortName } from "@/lib/outlet-codes";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Task } from "@nusafood/types";
import { ChevronDown, Clock, MapPin, Send, User, Users } from "lucide-react";
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

const PREVIEW_COUNT = 5;
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
  const [showAll, setShowAll] = useState(false);
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

  const visible = showAll ? tasks : tasks.slice(0, PREVIEW_COUNT);
  const hidden = tasks.length - visible.length;

  return (
    <Card className="gap-0 overflow-hidden border-primary/30 py-0">
      <div className="flex items-start justify-between gap-3 border-b bg-primary/5 px-4 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Send className="size-4 text-primary" />
            Siap Dikirim
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Belum dikirim ke PIC dan deadline belum lewat. Tap Kirim WA, lalu
            tekan kirim di WhatsApp.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
          {tasks.length}
        </span>
      </div>
      <CardContent className="px-4 py-0">
        <ul className="divide-y">
          {visible.map((task) => (
            <li
              key={task.task_id}
              className="space-y-2.5 py-3 sm:flex sm:items-center sm:gap-4 sm:space-y-0"
            >
              <div className="min-w-0 space-y-2.5 sm:flex-1">
                <Link href={`/tasks/${task.task_id}`} className="block min-w-0">
                  <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                    {task.task_title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="flex min-w-0 items-center gap-1">
                      <User className="size-3.5 shrink-0" />
                      <span className="truncate">{task.pic_name}</span>
                    </span>
                    <span className="flex min-w-0 items-center gap-1">
                      <MapPin className="size-3.5 shrink-0" />
                      <span className="truncate">{outletShortName(String(task.outlet))}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3.5 shrink-0" />
                      {formatDateTimeId(task.deadline)}
                    </span>
                  </div>
                </Link>
                {task.pic_position ? (
                  <PicPicker
                    task={task}
                    busy={reassigning === task.task_id}
                    onChange={(staffId) => void reassign(task, staffId)}
                  />
                ) : null}
              </div>
              <div className="flex gap-2 sm:w-64 sm:shrink-0">
                {task.wa_link ? (
                  <Button asChild size="sm" className="h-9 flex-1">
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
                <Button asChild size="sm" variant="outline" className="h-9">
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
      {tasks.length > PREVIEW_COUNT ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="flex w-full items-center justify-center gap-1 border-t py-2.5 text-sm font-medium text-primary hover:bg-muted/50"
        >
          {showAll ? "Tampilkan lebih sedikit" : `Tampilkan ${hidden} lainnya`}
          <ChevronDown className={`size-4 transition-transform ${showAll ? "rotate-180" : ""}`} />
        </button>
      ) : null}
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
          className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 text-base text-foreground"
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

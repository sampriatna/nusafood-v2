"use client";

import { useEffect, useState } from "react";
import type { Task } from "@nusafood/types";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTanggalJam, taskStatusText } from "@/lib/letter/letter-format";

type Props = {
  value: string;
  title?: string;
  /** Kalau karyawan sudah dipilih, tampilkan tugas miliknya lebih dulu. */
  employeeId?: string;
  employeeName?: string;
  onPick: (taskId: string) => void;
  onClear: () => void;
};

/** Cari tugas lewat judul / nama staff / kode — tanpa copas kode TASK. */
export function TaskPicker({ value, title, employeeId, employeeName, onPick, onClear }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const searching = !value;

  useEffect(() => {
    if (!searching) return;
    const q = query.trim();
    const params = new URLSearchParams({ limit: "8" });
    if (q) params.set("q", q);
    else if (employeeId) params.set("staff_id", employeeId);

    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/tasks?${params}`, { credentials: "include", signal: ctrl.signal })
        .then((res) => res.json())
        .then((json: { success?: boolean; data?: Task[] }) => {
          setResults(json.success && json.data ? json.data : []);
        })
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, q ? 300 : 0);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, employeeId, searching]);

  if (value) {
    return (
      <div className="flex items-start justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
        <div className="min-w-0 text-sm">
          <p className="truncate font-medium">{title || value}</p>
          {title ? <p className="text-xs text-muted-foreground">{value}</p> : null}
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={onClear}>
          <X className="mr-1 size-4" />
          Ganti
        </Button>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari judul tugas, nama staff, atau kode…"
          className="pl-9 text-base"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {query.trim()
          ? "Hasil pencarian"
          : employeeId
            ? `Tugas terbaru ${employeeName || "karyawan ini"}`
            : "Tugas terbaru — ketik untuk mencari"}
        {loading ? <Loader2 className="ml-1 inline size-3 animate-spin" /> : null}
      </p>
      {results.length ? (
        <ul className="max-h-72 w-full divide-y overflow-y-auto rounded-md border">
          {results.map((task) => (
            <li key={task.task_id}>
              <button
                type="button"
                className="block w-full min-w-0 px-3 py-2 text-left hover:bg-muted/50"
                onClick={() => onPick(task.task_id)}
              >
                <p className="truncate text-sm font-medium">{task.task_title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {task.pic_name} · deadline {formatTanggalJam(task.deadline)} ·{" "}
                  {taskStatusText(task.status)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      ) : !loading ? (
        <p className="text-xs text-muted-foreground">Tidak ada tugas yang cocok.</p>
      ) : null}
    </div>
  );
}

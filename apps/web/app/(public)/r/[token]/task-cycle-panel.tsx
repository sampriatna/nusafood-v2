import type { Task } from "@nusafood/types";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Flag,
  Target,
  Zap,
} from "lucide-react";
import { parseTaskCycleDescription } from "@/lib/task-cycle";
import { cn } from "@/lib/utils";

type Props = {
  tasks: Task[];
};

function formatDeadline(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Deadline belum valid";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function priorityLabel(priority: Task["priority"]) {
  if (priority === "Urgent") return "Darurat";
  if (priority === "High") return "Tinggi";
  if (priority === "Low") return "Rendah";
  return "Normal";
}

export function TaskCyclePanel({ tasks }: Props) {
  return (
    <section className="bg-slate-950 px-4 py-5 text-white">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Fokus kerja
              </p>
              <h2 className="text-xl font-bold">Tugas Saya</h2>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold">
              {tasks.length} aktif
            </span>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">
            Kalau tugas sudah muncul di sini, itu sudah dianggap instruksi kerja.
            Tidak perlu menunggu diingatkan lagi.
          </p>
        </div>

        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-300" />
              <div>
                <p className="font-semibold">Tidak ada tugas khusus aktif</p>
                <p className="mt-1 text-sm text-slate-300">
                  Lanjutkan kegiatan SOP harian di bawah.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task, index) => {
              const cycle = parseTaskCycleDescription(task.task_description);
              const deadlineMs = new Date(task.deadline).getTime();
              const overdue =
                Number.isFinite(deadlineMs) && deadlineMs < Date.now();

              return (
                <article
                  key={task.task_id}
                  className={cn(
                    "overflow-hidden rounded-2xl border bg-white text-slate-950 shadow-sm",
                    overdue ? "border-rose-300" : "border-white/15",
                  )}
                >
                  <div className="space-y-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Prioritas #{index + 1}
                        </p>
                        <h3 className="text-lg font-bold leading-snug">
                          {task.task_title}
                        </h3>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold",
                          task.priority === "Urgent" || overdue
                            ? "bg-rose-100 text-rose-800"
                            : task.priority === "High"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-slate-100 text-slate-700",
                        )}
                      >
                        {overdue ? "Terlambat" : priorityLabel(task.priority)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-semibold">
                      <Clock3 className="size-4 shrink-0" />
                      Selesai paling lambat {formatDeadline(task.deadline)}
                    </div>

                    {cycle.purpose ? (
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Buat apa?
                        </p>
                        <p className="text-sm leading-relaxed">{cycle.purpose}</p>
                      </div>
                    ) : null}

                    <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-3">
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-blue-800">
                        <Zap className="size-3.5" /> Kerjakan sekarang
                      </p>
                      <p className="font-semibold leading-relaxed text-blue-950">
                        {cycle.nextAction}
                      </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {cycle.target ? (
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                            <Target className="size-3.5" /> Target
                          </p>
                          <p className="text-sm font-medium leading-relaxed">
                            {cycle.target}
                          </p>
                        </div>
                      ) : null}
                      <div className="rounded-xl bg-emerald-50 p-3">
                        <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-800">
                          <Flag className="size-3.5" /> Selesai kalau
                        </p>
                        <p className="text-sm font-medium leading-relaxed text-emerald-950">
                          {cycle.doneWhen}
                        </p>
                      </div>
                    </div>

                    {cycle.trigger ? (
                      <p className="text-sm leading-relaxed text-slate-600">
                        <span className="font-semibold text-slate-900">
                          Mulai saat:
                        </span>{" "}
                        {cycle.trigger}
                      </p>
                    ) : null}

                    <div className="flex items-start gap-2 text-sm leading-relaxed text-slate-600">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                      <p>
                        <span className="font-semibold text-slate-900">
                          Kalau terhambat:
                        </span>{" "}
                        {cycle.escalation}
                      </p>
                    </div>

                    <a
                      href={task.report_link}
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-center font-bold text-white active:scale-[0.99]"
                    >
                      Buka tugas & kirim hasil
                      <ArrowRight className="size-4" />
                    </a>

                    {!cycle.structured ? (
                      <p className="text-center text-xs text-slate-400">
                        Task lama — detail otomatis disederhanakan oleh sistem.
                      </p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

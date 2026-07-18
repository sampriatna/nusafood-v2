import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateTimeId } from "@/lib/format-datetime";
import { StatusBadge } from "@/components/status-badge";
import { getSession } from "@/lib/auth";
import {
  OutletAccessError,
  assertTaskOutletAccess,
} from "@/lib/outlet-scope";
import { getTaskById } from "@/lib/services/task.service";
import { TaskActions } from "./task-actions";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ taskId: string }>;
};

export default async function TaskDetailPage({ params }: Props) {
  const { taskId } = await params;
  const session = await getSession();
  if (session) {
    try {
      await assertTaskOutletAccess(session, taskId);
    } catch (error) {
      if (error instanceof OutletAccessError) notFound();
      throw error;
    }
  }
  const task = await getTaskById(taskId);
  if (!task) notFound();

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-xl space-y-6">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Dashboard
        </Link>
        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{task.task_title}</h1>
            <StatusBadge status={task.status} />
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {task.task_id}
          </p>
        </header>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Outlet / Area / Kategori</dt>
            <dd>
              {task.outlet} · {task.area} · {task.category}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">PIC</dt>
            <dd>
              {task.pic_name} ({task.pic_wa})
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Deadline</dt>
            <dd>{formatDateTimeId(task.deadline)} WIB</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Deskripsi</dt>
            <dd className="whitespace-pre-wrap">
              {task.task_description || "—"}
            </dd>
          </div>
          {task.staff_note ? (
            <div>
              <dt className="text-muted-foreground">Catatan staff</dt>
              <dd>{task.staff_note}</dd>
            </div>
          ) : null}
          {task.after_photo_url ? (
            <div>
              <dt className="mb-2 text-muted-foreground">Foto bukti</dt>
              <dd>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={task.after_photo_url}
                  alt="Foto bukti"
                  className="max-h-72 w-full rounded-md border border-border object-cover"
                />
              </dd>
            </div>
          ) : null}
          {task.report_link ? (
            <div>
              <dt className="text-muted-foreground">Link laporan</dt>
              <dd className="break-all font-mono text-xs">
                <a href={task.report_link} className="hover:underline">
                  {task.report_link}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>

        <TaskActions
          taskId={task.task_id}
          status={task.status}
          checklistMode={task.checklist_mode}
        />
      </div>
    </main>
  );
}

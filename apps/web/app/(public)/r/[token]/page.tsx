import { prisma } from "@/lib/db";
import {
  DailyActivityError,
  getStaffReportByToken,
} from "@/lib/services/daily-activity.service";
import { loadSopContextForStaff } from "@/lib/services/sop-context.service";
import type { ReportTemplate } from "@/lib/daily-activity-types";
import { DailyActivityClient } from "./daily-activity-client";
import { PushNotificationSetup } from "./push-notification-setup";

type Props = {
  params: Promise<{ token: string }>;
};

export const dynamic = "force-dynamic";

function deadlineLabel(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default async function DailyActivityPage({ params }: Props) {
  const { token } = await params;

  try {
    const data = await getStaffReportByToken(token);
    const [sop, incomingTasks] = await Promise.all([
      loadSopContextForStaff(data.staff.staff_id),
      prisma.task.findMany({
        where: {
          staffId: data.staff.staff_id,
          createdBy: { startsWith: "daily-report:" },
          status: { notIn: ["DONE", "VERIFIED"] },
        },
        select: {
          taskId: true,
          taskTitle: true,
          taskDescription: true,
          priority: true,
          status: true,
          reportLink: true,
          outletName: true,
          areaName: true,
          deadline: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    return (
      <>
        <PushNotificationSetup token={token} />

        {incomingTasks.length ? (
          <section className="bg-muted/30 px-4 pt-4">
            <div className="mx-auto max-w-lg rounded-2xl border-2 border-orange-300 bg-orange-50 p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
                    Koordinasi operasional
                  </p>
                  <h1 className="mt-0.5 text-xl font-bold text-orange-950">
                    Pekerjaan Masuk dari Kendala
                  </h1>
                  <p className="mt-1 text-sm text-orange-900/75">
                    Temuan staff yang diarahkan kepadamu. Buka pekerjaan, cek kondisi, lalu laporkan hasilnya.
                  </p>
                </div>
                <span className="rounded-full bg-orange-600 px-2.5 py-1 text-sm font-bold text-white">
                  {incomingTasks.length}
                </span>
              </div>

              <div className="space-y-3">
                {incomingTasks.map((task) => (
                  <article
                    key={task.taskId}
                    className="rounded-xl border border-orange-200 bg-white p-3.5"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <span>{task.outletName || "Outlet"}</span>
                      {task.areaName ? <span>· {task.areaName}</span> : null}
                      <span>· {task.priority}</span>
                      <span>· deadline {deadlineLabel(task.deadline)}</span>
                    </div>
                    <h2 className="mt-1.5 font-bold leading-snug text-foreground">
                      {task.taskTitle.replace(/^\[Kendala SOP\]\s*/i, "")}
                    </h2>
                    {task.taskDescription ? (
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {task.taskDescription}
                      </p>
                    ) : null}
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">
                        {task.status === "OPEN" || task.status === "CREATED"
                          ? "Belum dikerjakan"
                          : task.status.replaceAll("_", " ")}
                      </span>
                      {task.reportLink ? (
                        <a
                          href={task.reportLink}
                          className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-bold text-white active:scale-[0.98]"
                        >
                          Buka & kerjakan
                        </a>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <DailyActivityClient
          token={token}
          initialData={{
            staff: data.staff,
            templates: data.templates as ReportTemplate[],
            today_submissions: data.today_submissions,
            link_active: data.link.is_active,
            coordination: sop?.coordination ?? [],
            track_record: sop?.track_record ?? null,
          }}
        />
      </>
    );
  } catch (error) {
    const message =
      error instanceof DailyActivityError
        ? error.message
        : "Gagal memuat data.\nPeriksa koneksi internet Anda.";
    return <DailyActivityClient token={token} initialError={message} />;
  }
}

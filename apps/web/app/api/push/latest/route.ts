import { fail, ok } from "@/lib/api/response";
import { prisma } from "@/lib/db";
import {
  DailyActivityError,
  getStaffReportByToken,
} from "@/lib/services/daily-activity.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
    if (!token) {
      return fail("Token staff wajib diisi", {
        code: "PUSH_TOKEN_REQUIRED",
        status: 400,
      });
    }

    const data = await getStaffReportByToken(token);
    const task = await prisma.task.findFirst({
      where: {
        staffId: data.staff.staff_id,
        status: { notIn: ["DONE", "VERIFIED"] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        taskId: true,
        taskTitle: true,
        outletName: true,
        areaName: true,
        priority: true,
        reportLink: true,
      },
    });

    return ok({
      task: task
        ? {
            task_id: task.taskId,
            title: task.taskTitle.replace(/^\[Kendala SOP\]\s*/i, ""),
            outlet: task.outletName,
            area: task.areaName,
            priority: task.priority,
            report_link: task.reportLink,
          }
        : null,
    });
  } catch (error) {
    if (error instanceof DailyActivityError) {
      return fail(error.message, { code: error.code, status: error.status });
    }
    console.error("[GET /api/push/latest]", error);
    return fail("Gagal mengambil tugas terbaru", {
      code: "PUSH_LATEST_FAILED",
      status: 500,
    });
  }
}

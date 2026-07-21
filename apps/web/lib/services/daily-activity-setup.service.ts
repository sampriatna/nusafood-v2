import { prisma } from "@/lib/db";

export type DailyActivitySetupStats = {
  template_count: number;
  active_link_count: number;
  active_staff_count: number;
};

export async function getDailyActivitySetupStats(): Promise<DailyActivitySetupStats> {
  const [template_count, active_link_count, active_staff_count] =
    await Promise.all([
      prisma.reportTemplate.count(),
      prisma.staffReportLink.count({ where: { isActive: true } }),
      prisma.staff.count({ where: { status: "ACTIVE" } }),
    ]);

  return { template_count, active_link_count, active_staff_count };
}

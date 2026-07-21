import {
  DailyActivityError,
  getStaffReportByToken,
} from "@/lib/services/daily-activity.service";
import type { ReportTemplate } from "@/lib/daily-activity-types";
import { DailyActivityClient } from "./daily-activity-client";

type Props = {
  params: Promise<{ token: string }>;
};

export const dynamic = "force-dynamic";

export default async function DailyActivityPage({ params }: Props) {
  const { token } = await params;

  try {
    const data = await getStaffReportByToken(token);
    return (
      <DailyActivityClient
        token={token}
        initialData={{
          staff: data.staff,
          templates: data.templates as ReportTemplate[],
          today_submissions: data.today_submissions,
          link_active: data.link.is_active,
        }}
      />
    );
  } catch (error) {
    const message =
      error instanceof DailyActivityError
        ? error.message
        : "Gagal memuat data.\nPeriksa koneksi internet Anda.";
    return <DailyActivityClient token={token} initialError={message} />;
  }
}

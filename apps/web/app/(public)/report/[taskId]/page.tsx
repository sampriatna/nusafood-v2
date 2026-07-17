import { StaffReportClient } from "./staff-report-client";

type Props = {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function ReportPage({ params, searchParams }: Props) {
  const { taskId } = await params;
  const { token } = await searchParams;

  return <StaffReportClient taskId={taskId} token={token ?? ""} />;
}

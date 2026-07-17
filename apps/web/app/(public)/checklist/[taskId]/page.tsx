import { StaffChecklistClient } from "./staff-checklist-client";

type Props = {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function ChecklistPage({ params, searchParams }: Props) {
  const { taskId } = await params;
  const { token } = await searchParams;
  return <StaffChecklistClient taskId={taskId} token={token ?? ""} />;
}

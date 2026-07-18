import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  OutletAccessError,
  assertTaskOutletAccess,
} from "@/lib/outlet-scope";
import { getTaskById } from "@/lib/services/task.service";
import { TaskDetailClient } from "./task-detail-client";

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

  return <TaskDetailClient task={task} />;
}

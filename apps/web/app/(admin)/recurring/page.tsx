import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function RecurringPage() {
  redirect("/settings/recurring-tasks");
}

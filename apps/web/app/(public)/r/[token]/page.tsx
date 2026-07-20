import { DailyActivityClient } from "./daily-activity-client";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function DailyActivityPage({ params }: Props) {
  const { token } = await params;
  return <DailyActivityClient token={token} />;
}

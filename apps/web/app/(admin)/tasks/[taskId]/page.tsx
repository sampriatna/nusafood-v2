type Props = {
  params: Promise<{ taskId: string }>;
};

export default async function TaskDetailPage({ params }: Props) {
  const { taskId } = await params;

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-xl space-y-3">
        <h1 className="text-2xl font-semibold">Detail tugas</h1>
        <p className="font-mono text-sm text-muted-foreground">{taskId}</p>
      </div>
    </main>
  );
}

type Props = {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function ChecklistPage({ params, searchParams }: Props) {
  const { taskId } = await params;
  const { token } = await searchParams;

  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-md space-y-3">
        <h1 className="text-xl font-semibold">Checklist</h1>
        <p className="text-sm text-muted-foreground">
          Halaman staff checklist (URL kompatibel v1). Implementasi di Sprint 5.
        </p>
        <dl className="space-y-1 text-sm">
          <div>
            <dt className="text-muted-foreground">Task ID</dt>
            <dd className="font-mono">{taskId}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Token</dt>
            <dd className="font-mono">{token ? "•••• provided" : "missing"}</dd>
          </div>
        </dl>
      </div>
    </main>
  );
}

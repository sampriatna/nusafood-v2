type Props = { params: Promise<{ templateId: string }> };

export default async function ChecklistTemplatePage({ params }: Props) {
  const { templateId } = await params;
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-xl space-y-3">
        <h1 className="text-2xl font-semibold">Checklist template</h1>
        <p className="font-mono text-sm text-muted-foreground">{templateId}</p>
      </div>
    </main>
  );
}

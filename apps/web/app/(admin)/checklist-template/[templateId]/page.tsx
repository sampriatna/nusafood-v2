import Link from "next/link";
import { notFound } from "next/navigation";
import { SettingsBackLink } from "@/components/settings-back-link";
import { getChecklistTemplate } from "@/lib/services/checklist.service";
import { getRecurringTemplate } from "@/lib/services/recurring.service";
import { ChecklistEditor } from "./checklist-editor";
import { GenerateChecklistButton } from "./generate-button";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ templateId: string }> };

export default async function ChecklistTemplatePage({ params }: Props) {
  const { templateId } = await params;
  const [template, recurring] = await Promise.all([
    getChecklistTemplate(templateId),
    getRecurringTemplate(templateId),
  ]);
  if (!template) notFound();

  const picName = recurring?.pic_name ?? "";
  const picWa = recurring?.pic_wa ?? "";

  return (
    <main className="min-h-screen bg-background px-4 py-8 pb-24 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-2">
          <SettingsBackLink href="/settings/recurring-tasks" />
          <h1 className="text-2xl font-semibold">Item Checklist</h1>
        </div>

        <section className="rounded-lg border border-border bg-card p-4 space-y-1">
          <p className="font-medium">{template.template_name}</p>
          <p className="text-sm text-muted-foreground">
            {template.template_id} · {template.outlet}
            {template.area ? ` · ${template.area}` : ""}
          </p>
          {recurring ? (
            <p className="text-xs text-muted-foreground">
              {recurring.repeat_type} · {recurring.repeat_time} –{" "}
              {recurring.deadline_time}
              {recurring.active_status ? "" : " · nonaktif"}
            </p>
          ) : null}
        </section>

        <ChecklistEditor
          templateId={template.template_id}
          initialItems={template.items}
        />

        <GenerateChecklistButton
          templateId={template.template_id}
          picName={picName}
          picWa={picWa}
        />

        <p className="text-xs text-muted-foreground">
          <Link href="/settings/recurring-tasks" className="hover:underline">
            ← Kembali ke daftar template
          </Link>
        </p>
      </div>
    </main>
  );
}

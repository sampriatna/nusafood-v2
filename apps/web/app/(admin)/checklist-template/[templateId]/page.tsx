import Link from "next/link";
import { notFound } from "next/navigation";
import { getChecklistTemplate } from "@/lib/services/checklist.service";
import { GenerateChecklistButton } from "./generate-button";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ templateId: string }> };

export default async function ChecklistTemplatePage({ params }: Props) {
  const { templateId } = await params;
  const template = await getChecklistTemplate(templateId);
  if (!template) notFound();

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-xl space-y-6">
        <Link
          href="/settings"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Pengaturan
        </Link>
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">{template.template_name}</h1>
          <p className="text-sm text-muted-foreground">
            {template.template_id} · {template.outlet} · {template.area}
          </p>
          <p className="text-sm">{template.items.length} item</p>
        </header>

        <ul className="divide-y divide-border text-sm">
          {template.items.map((item) => (
            <li key={item.checklist_item_id} className="py-2">
              <p className="font-medium">
                {item.item_order}. {item.item_text}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.is_required ? "wajib" : "opsional"}
                {item.requires_photo ? " · foto" : ""}
              </p>
            </li>
          ))}
        </ul>

        <GenerateChecklistButton templateId={template.template_id} />
      </div>
    </main>
  );
}

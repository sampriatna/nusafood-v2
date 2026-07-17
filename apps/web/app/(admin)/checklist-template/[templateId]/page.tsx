import { AdminPage } from "@/components/admin-page";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getChecklistTemplate } from "@/lib/services/checklist.service";
import { getRecurringTemplate } from "@/lib/services/recurring.service";
import { notFound } from "next/navigation";
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

  return (
    <AdminPage title="Item Checklist" backHref="/settings/recurring-tasks">
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{template.template_name}</h2>
            {recurring && !recurring.active_status ? (
              <Badge variant="secondary">Nonaktif</Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {template.outlet}
            {template.area ? ` · ${template.area}` : ""}
          </p>
          {recurring ? (
            <p className="text-xs text-muted-foreground">
              {recurring.pic_name} · {recurring.repeat_time} –{" "}
              {recurring.deadline_time}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <ChecklistEditor
        templateId={template.template_id}
        initialItems={template.items}
      />

      <GenerateChecklistButton
        templateId={template.template_id}
        picName={recurring?.pic_name ?? ""}
        picWa={recurring?.pic_wa ?? ""}
      />

      <div className="h-16" />
    </AdminPage>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  REPORT_POSITION_GROUPS,
  type DailyActivityApiResponse,
  type ReportTemplate,
  type ReportTemplateCategory,
  type ReportTemplateKind,
} from "@/lib/daily-activity-types";

type ChecklistDraft = {
  item_text: string;
  is_required: boolean;
};

type TemplateForm = {
  title: string;
  category: ReportTemplateCategory;
  description: string;
  standard_result: string;
  outlet_id: string;
  position_group: string;
  requires_photo: boolean;
  is_required_daily: boolean;
  kind: ReportTemplateKind;
  target_time_start: string;
  target_time_end: string;
  active: boolean;
  sort_order: number;
  checklist_draft: ChecklistDraft[];
};

const categories: ReportTemplateCategory[] = [
  "Cleaning",
  "Opening",
  "Closing",
  "Stock",
  "Production",
  "Maintenance",
  "Kendala",
  "Special",
  "General",
];

const emptyForm: TemplateForm = {
  title: "",
  category: "Cleaning",
  description: "",
  standard_result: "",
  outlet_id: "",
  position_group: "Waiters",
  requires_photo: true,
  is_required_daily: true,
  kind: "daily_required",
  target_time_start: "",
  target_time_end: "",
  active: true,
  sort_order: 10,
  checklist_draft: [{ item_text: "", is_required: true }],
};

export function ReportTemplatesManager() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ReportTemplate | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/staff-reports/templates", {
        credentials: "include",
      });
      const json =
        (await res.json()) as DailyActivityApiResponse<ReportTemplate[]>;
      if (!json.success || !json.data) {
        toast({
          title: "Gagal memuat template",
          description: json.error || "Coba lagi",
          variant: "destructive",
        });
        return;
      }
      setTemplates(json.data);
    } catch {
      toast({
        title: "Gagal memuat template",
        description: "Periksa koneksi lalu coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      checklist_draft: [{ item_text: "", is_required: true }],
    });
    setDialogOpen(true);
  }

  function openEdit(template: ReportTemplate) {
    setEditing(template);
    setForm({
      title: template.title,
      category: (template.category || "Cleaning") as ReportTemplateCategory,
      description: template.description || "",
      standard_result: template.standard_result || "",
      outlet_id: template.outlet_id || "",
      position_group: template.position_group || "ALL",
      requires_photo: template.requires_photo,
      is_required_daily: template.is_required_daily,
      kind: (template.kind || "daily_required") as ReportTemplateKind,
      target_time_start: template.target_time_start || "",
      target_time_end: template.target_time_end || "",
      active: template.active,
      sort_order: template.sort_order ?? 10,
      checklist_draft:
        template.checklist_items && template.checklist_items.length > 0
          ? template.checklist_items.map((item) => ({
              item_text: item.item_text,
              is_required: item.is_required,
            }))
          : [{ item_text: "", is_required: true }],
    });
    setDialogOpen(true);
  }

  async function saveTemplate() {
    if (!form.title.trim()) {
      toast({ title: "Nama kegiatan wajib", variant: "destructive" });
      return;
    }

    const checklistItems = form.checklist_draft
      .map((item, index) => ({
        item_text: item.item_text.trim(),
        is_required: item.is_required,
        sort_order: index + 1,
      }))
      .filter((item) => item.item_text);

    if (checklistItems.length === 0) {
      toast({ title: "Minimal 1 checklist item", variant: "destructive" });
      return;
    }

    const payload = {
      title: form.title.trim(),
      category: form.category,
      description:
        form.description.trim() || form.standard_result.trim() || form.title,
      standard_result:
        form.standard_result.trim() || form.description.trim() || form.title,
      outlet_id: form.outlet_id.trim() || null,
      position_group:
        form.position_group === "ALL" ? null : form.position_group,
      requires_photo: form.requires_photo,
      is_required_daily: form.is_required_daily,
      kind: form.kind,
      target_time_start: form.target_time_start || null,
      target_time_end: form.target_time_end || null,
      active: form.active,
      sort_order: form.sort_order,
      checklist_items: checklistItems,
    };

    setIsSubmitting(true);
    try {
      const res = await fetch(
        editing
          ? `/api/staff-reports/templates/${encodeURIComponent(editing.id)}`
          : "/api/staff-reports/templates",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        },
      );
      const json =
        (await res.json()) as DailyActivityApiResponse<ReportTemplate>;
      if (!json.success) {
        toast({
          title: "Gagal menyimpan",
          description: json.error || "Coba lagi",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: editing ? "Template diupdate" : "Template ditambahkan",
        description: form.title,
      });
      setDialogOpen(false);
      await loadTemplates();
    } catch {
      toast({
        title: "Gagal menyimpan",
        description: "Periksa koneksi lalu coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleActive(template: ReportTemplate) {
    try {
      const res = await fetch(
        `/api/staff-reports/templates/${encodeURIComponent(template.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ active: !template.active }),
        },
      );
      const json =
        (await res.json()) as DailyActivityApiResponse<ReportTemplate>;
      if (!json.success) {
        toast({
          title: "Gagal update status",
          description: json.error || "Coba lagi",
          variant: "destructive",
        });
        return;
      }
      await loadTemplates();
    } catch {
      toast({
        title: "Gagal update status",
        description: "Periksa koneksi lalu coba lagi.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {templates.length} template
          {templates.length
            ? ` · ${templates.filter((template) => template.active).length} aktif`
            : ""}
        </p>
        <Button onClick={openCreate}>
          <Plus className="mr-1 size-4" />
          Tambah
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Memuat template...
          </CardContent>
        </Card>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <FileText className="mx-auto mb-2 size-10 opacity-40" />
            Belum ada template
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <Card key={template.id} className={!template.active ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{template.title}</h3>
                      <Badge variant="outline">{template.category}</Badge>
                      {template.is_required_daily ? (
                        <Badge variant="secondary">Wajib harian</Badge>
                      ) : null}
                      {template.requires_photo ? (
                        <Badge variant="outline">Foto</Badge>
                      ) : null}
                      <Badge variant={template.active ? "default" : "secondary"}>
                        {template.active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {template.standard_result || template.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Outlet: {template.outlet_id || "Semua"} · Posisi:{" "}
                      {template.position_group || "Semua"} · Checklist:{" "}
                      {template.checklist_items?.length || 0}
                      {template.target_time_start || template.target_time_end
                        ? ` · Target ${template.target_time_start || "?"}-${template.target_time_end || "?"}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(template)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Aktif</span>
                      <Switch
                        checked={template.active}
                        onCheckedChange={() => void toggleActive(template)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Kegiatan" : "Tambah Kegiatan"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama kegiatan *</Label>
              <Input
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                placeholder="Contoh: Bersihin WC"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select
                  value={form.category}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      category: value as ReportTemplateCategory,
                      kind:
                        value === "Kendala"
                          ? "issue_quick"
                          : form.is_required_daily
                            ? "daily_required"
                            : form.kind,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Posisi</Label>
                <Select
                  value={form.position_group}
                  onValueChange={(value) =>
                    setForm({ ...form, position_group: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua</SelectItem>
                    {REPORT_POSITION_GROUPS.map((group) => (
                      <SelectItem key={group} value={group}>
                        {group === "PA" ? "PA / OB (Public Area)" : group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Outlet</Label>
              <Input
                value={form.outlet_id}
                onChange={(event) =>
                  setForm({ ...form, outlet_id: event.target.value })
                }
                placeholder="Kosongkan untuk semua outlet"
              />
            </div>

            <div className="space-y-2">
              <Label>Standar hasil *</Label>
              <Textarea
                value={form.standard_result}
                onChange={(event) =>
                  setForm({ ...form, standard_result: event.target.value })
                }
                placeholder="WC bersih, kering, tidak bau, sabun/tisu tersedia..."
              />
            </div>

            <div className="space-y-2">
              <Label>Deskripsi tambahan</Label>
              <Textarea
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="Opsional"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Jam target mulai</Label>
                <Input
                  type="time"
                  value={form.target_time_start}
                  onChange={(event) =>
                    setForm({ ...form, target_time_start: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Jam target selesai</Label>
                <Input
                  type="time"
                  value={form.target_time_end}
                  onChange={(event) =>
                    setForm({ ...form, target_time_end: event.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Checklist kerja *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm({
                      ...form,
                      checklist_draft: [
                        ...form.checklist_draft,
                        { item_text: "", is_required: true },
                      ],
                    })
                  }
                >
                  <Plus className="mr-1 size-3" />
                  Item
                </Button>
              </div>
              <div className="space-y-2">
                {form.checklist_draft.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={item.item_text}
                      onChange={(event) => {
                        const next = [...form.checklist_draft];
                        next[index] = {
                          ...next[index],
                          item_text: event.target.value,
                        };
                        setForm({ ...form, checklist_draft: next });
                      }}
                      placeholder={`Checklist ${index + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={form.checklist_draft.length <= 1}
                      onClick={() =>
                        setForm({
                          ...form,
                          checklist_draft: form.checklist_draft.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        })
                      }
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Wajib foto</Label>
              <Switch
                checked={form.requires_photo}
                onCheckedChange={(value) =>
                  setForm({ ...form, requires_photo: value })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Wajib harian</Label>
              <Switch
                checked={form.is_required_daily}
                onCheckedChange={(value) =>
                  setForm({
                    ...form,
                    is_required_daily: value,
                    kind: value
                      ? "daily_required"
                      : form.kind === "issue_quick"
                        ? "issue_quick"
                        : "special_task",
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Aktif</Label>
              <Switch
                checked={form.active}
                onCheckedChange={(value) => setForm({ ...form, active: value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => void saveTemplate()} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

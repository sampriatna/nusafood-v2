"use client";

import { useEffect, useState } from "react";
import { MobileHeader } from "@/components/mobile-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  listReportTemplates,
  createReportTemplate,
  updateReportTemplate,
} from "@/lib/api/daily-report-client";
import { fetchOutlets } from "@/lib/api/client";
import type {
  CreateReportTemplatePayload,
  Outlet,
  ReportTemplate,
  ReportTemplateCategory,
  ReportTemplateKind,
} from "@nusafood/types";
import { REPORT_POSITION_GROUPS } from "@nusafood/types";
import { Plus, Pencil, FileText, Trash2 } from "lucide-react";

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

type ChecklistDraft = { item_text: string; is_required: boolean };

const emptyForm: CreateReportTemplatePayload & { checklist_draft: ChecklistDraft[] } = {
  title: "",
  category: "Cleaning",
  description: "",
  standard_result: "",
  outlet_id: null,
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

export default function ReportTemplatesSettingsPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<ReportTemplate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outlets, setOutlets] = useState<string[]>(["KBU", "Kisamen", "Samtaro Express"]);

  const load = async () => {
    setIsLoading(true);
    try {
      const [result, outletsRes] = await Promise.all([
        listReportTemplates(),
        fetchOutlets(),
      ]);
      if (result.success && result.data) setTemplates(result.data);
      if (outletsRes.success && outletsRes.data?.length) {
        setOutlets(outletsRes.data.map((o) => o.name || o.code));
      }
    } catch {
      toast({ title: "Error", description: "Gagal memuat template", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, checklist_draft: [{ item_text: "", is_required: true }] });
    setIsOpen(true);
  };

  const openEdit = (t: ReportTemplate) => {
    setEditing(t);
    setForm({
      title: t.title,
      category: t.category,
      description: t.description,
      standard_result: t.standard_result,
      outlet_id: t.outlet_id,
      position_group: t.position_group,
      requires_photo: t.requires_photo,
      is_required_daily: t.is_required_daily,
      kind: t.kind,
      target_time_start: t.target_time_start || "",
      target_time_end: t.target_time_end || "",
      active: t.active,
      sort_order: t.sort_order,
      checklist_draft:
        t.checklist_items && t.checklist_items.length > 0
          ? t.checklist_items.map((i) => ({
              item_text: i.item_text,
              is_required: i.is_required,
            }))
          : [{ item_text: "", is_required: true }],
    });
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!form.title?.trim()) {
      toast({ title: "Nama kegiatan wajib", variant: "destructive" });
      return;
    }
    const checklist_items = (form.checklist_draft || [])
      .map((i, idx) => ({
        item_text: i.item_text.trim(),
        is_required: i.is_required,
        sort_order: idx + 1,
      }))
      .filter((i) => i.item_text);

    if (checklist_items.length === 0) {
      toast({ title: "Minimal 1 checklist item", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: form.title,
        category: form.category,
        description: form.standard_result || form.description,
        standard_result: form.standard_result || form.description,
        outlet_id: form.outlet_id,
        position_group: form.position_group,
        requires_photo: form.requires_photo,
        is_required_daily: form.is_required_daily,
        kind: form.kind as ReportTemplateKind,
        target_time_start: form.target_time_start || null,
        target_time_end: form.target_time_end || null,
        active: form.active,
        sort_order: form.sort_order,
        checklist_items,
      };

      if (editing) {
        const result = await updateReportTemplate({ ...payload, id: editing.id });
        if (!result.success) {
          toast({ title: "Gagal", description: result.error, variant: "destructive" });
          return;
        }
        toast({ title: "Template diupdate" });
      } else {
        const result = await createReportTemplate(payload);
        if (!result.success) {
          toast({ title: "Gagal", description: result.error, variant: "destructive" });
          return;
        }
        toast({ title: "Template ditambahkan" });
      }
      setIsOpen(false);
      await load();
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (t: ReportTemplate) => {
    const result = await updateReportTemplate({ id: t.id, active: !t.active });
    if (result.success) await load();
    else toast({ title: "Gagal", description: result.error, variant: "destructive" });
  };

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Template Kegiatan" showBack backHref="/settings" />

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">SOP Kegiatan Standar</h2>
            <p className="text-sm text-muted-foreground">
              Checklist + standar hasil + foto — bukan laporan bebas
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Tambah
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat...</p>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <FileText className="mx-auto h-10 w-10 mb-2 opacity-40" />
              Belum ada template
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <Card key={t.id} className={!t.active ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-medium">{t.title}</h3>
                        <Badge variant="outline">{t.category}</Badge>
                        {t.is_required_daily && (
                          <Badge variant="secondary">Wajib harian</Badge>
                        )}
                        {t.requires_photo && <Badge variant="outline">Foto</Badge>}
                        <Badge variant={t.active ? "default" : "secondary"}>
                          {t.active ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {t.standard_result || t.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Outlet: {t.outlet_id || "Semua"} · Posisi:{" "}
                        {t.position_group || "Semua"} · Checklist:{" "}
                        {t.checklist_items?.length || 0}
                        {(t.target_time_start || t.target_time_end) &&
                          ` · Target ${t.target_time_start || "?"}–${t.target_time_end || "?"}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Aktif</span>
                        <Switch checked={t.active} onCheckedChange={() => toggleActive(t)} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Kegiatan" : "Tambah Kegiatan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama kegiatan *</Label>
              <Input
                value={form.title || ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Contoh: Bersihin WC"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select
                  value={form.category || "Cleaning"}
                  onValueChange={(v) =>
                    setForm({ ...form, category: v as ReportTemplateCategory })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Posisi</Label>
                <Select
                  value={form.position_group || "ALL"}
                  onValueChange={(v) =>
                    setForm({ ...form, position_group: v === "ALL" ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua</SelectItem>
                    {REPORT_POSITION_GROUPS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g === "PA" ? "PA / OB (Public Area)" : g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Outlet</Label>
              <Select
                value={form.outlet_id || "ALL"}
                onValueChange={(v) =>
                  setForm({ ...form, outlet_id: v === "ALL" ? null : (v as Outlet) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua</SelectItem>
                  {outlets.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Standar hasil *</Label>
              <Textarea
                value={form.standard_result || ""}
                onChange={(e) => setForm({ ...form, standard_result: e.target.value })}
                placeholder="WC bersih, kering, tidak bau, sabun/tisu tersedia..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Jam target mulai</Label>
                <Input
                  type="time"
                  value={form.target_time_start || ""}
                  onChange={(e) => setForm({ ...form, target_time_start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Jam target selesai</Label>
                <Input
                  type="time"
                  value={form.target_time_end || ""}
                  onChange={(e) => setForm({ ...form, target_time_end: e.target.value })}
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
                        ...(form.checklist_draft || []),
                        { item_text: "", is_required: true },
                      ],
                    })
                  }
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Item
                </Button>
              </div>
              <div className="space-y-2">
                {(form.checklist_draft || []).map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      value={item.item_text}
                      onChange={(e) => {
                        const next = [...(form.checklist_draft || [])];
                        next[index] = { ...next[index], item_text: e.target.value };
                        setForm({ ...form, checklist_draft: next });
                      }}
                      placeholder={`Checklist ${index + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={(form.checklist_draft || []).length <= 1}
                      onClick={() => {
                        const next = (form.checklist_draft || []).filter((_, i) => i !== index);
                        setForm({ ...form, checklist_draft: next });
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Wajib foto</Label>
              <Switch
                checked={Boolean(form.requires_photo)}
                onCheckedChange={(v) => setForm({ ...form, requires_photo: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Wajib harian</Label>
              <Switch
                checked={Boolean(form.is_required_daily)}
                onCheckedChange={(v) =>
                  setForm({
                    ...form,
                    is_required_daily: v,
                    kind: v ? "daily_required" : form.kind === "issue_quick" ? "issue_quick" : "special_task",
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Aktif</Label>
              <Switch
                checked={form.active !== false}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

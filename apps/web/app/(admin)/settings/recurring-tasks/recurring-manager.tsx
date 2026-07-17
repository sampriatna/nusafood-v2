"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { RecurringTemplate, Staff } from "@nusafood/types";
import {
  AlertCircle,
  Calendar,
  Clock,
  ListChecks,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  User,
} from "lucide-react";
import { ChecklistInlinePanel } from "@/components/checklist-inline-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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

type Option = { value: string; label: string; outlet?: string | null };

type Props = {
  templates: RecurringTemplate[];
  outlets: Option[];
  areas: Option[];
  categories: Option[];
  staff: Staff[];
};

const REPEAT_OPTIONS = [
  { value: "daily", label: "Setiap Hari" },
  { value: "weekdays", label: "Hari Kerja (Sen–Jum)" },
  { value: "weekly", label: "Mingguan" },
  { value: "monthly", label: "Setiap Bulan" },
  { value: "custom", label: "Kustom" },
] as const;

const DAYS = [
  { value: "senin", label: "Sen" },
  { value: "selasa", label: "Sel" },
  { value: "rabu", label: "Rab" },
  { value: "kamis", label: "Kam" },
  { value: "jumat", label: "Jum" },
  { value: "sabtu", label: "Sab" },
  { value: "minggu", label: "Min" },
] as const;

function repeatLabel(template: RecurringTemplate): string {
  if (template.repeat_type === "daily") return "Setiap Hari";
  if (template.repeat_type === "weekdays") return "Hari Kerja";
  if (template.repeat_type === "weekly" && template.repeat_days.length) {
    const labels = template.repeat_days
      .map((d) => DAYS.find((x) => x.value === d)?.label ?? d)
      .join(", ");
    return `Mingguan (${labels})`;
  }
  return template.repeat_type;
}

function defaultDays(repeatType: string): string[] {
  if (repeatType === "weekdays") return DAYS.slice(0, 5).map((d) => d.value);
  if (repeatType === "weekly") return ["senin"];
  if (repeatType === "daily") return DAYS.map((d) => d.value);
  return [];
}

export function RecurringManager({
  templates,
  outlets,
  areas,
  categories,
  staff,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [openChecklistId, setOpenChecklistId] = useState<string | null>(null);
  const [formOutlet, setFormOutlet] = useState(outlets[0]?.value ?? "KBU");
  const [formArea, setFormArea] = useState("");
  const [formCategory, setFormCategory] = useState(categories[0]?.value ?? "");
  const [repeatType, setRepeatType] = useState("daily");
  const [repeatDays, setRepeatDays] = useState<string[]>(defaultDays("daily"));
  const [requiresPhoto, setRequiresPhoto] = useState(true);
  const [picName, setPicName] = useState("");
  const [picWa, setPicWa] = useState("");

  const filteredAreas = useMemo(
    () =>
      areas.filter(
        (a) => !a.outlet || a.outlet.toUpperCase() === formOutlet.toUpperCase(),
      ),
    [areas, formOutlet],
  );

  const filteredStaff = useMemo(
    () =>
      staff.filter(
        (s) =>
          s.status === "ACTIVE" &&
          String(s.outlet).toUpperCase() === formOutlet.toUpperCase(),
      ),
    [staff, formOutlet],
  );

  const activeCount = templates.filter((t) => t.active_status).length;

  function openCreateDialog() {
    const outlet = outlets[0]?.value ?? "KBU";
    const nextAreas = areas.filter(
      (a) => !a.outlet || a.outlet.toUpperCase() === outlet.toUpperCase(),
    );
    setFormOutlet(outlet);
    setFormArea(nextAreas[0]?.value ?? "");
    setFormCategory(categories[0]?.value ?? "");
    setRepeatType("daily");
    setRepeatDays(defaultDays("daily"));
    setRequiresPhoto(true);
    setPicName("");
    setPicWa("");
    setDialogOpen(true);
  }

  function toggleActive(template: RecurringTemplate) {
    startTransition(async () => {
      const res = await fetch(
        `/api/recurring-templates/${template.template_id}/toggle`,
        { method: "PATCH" },
      );
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || json.success === false) {
        toast({
          title: "Gagal",
          description: json.error || "Status template tidak berubah",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: template.active_status
          ? "Template dinonaktifkan"
          : "Template diaktifkan",
      });
      router.refresh();
    });
  }

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const payload = {
      template_name: String(formData.get("template_name") || ""),
      outlet: formOutlet,
      area: formArea,
      category: formCategory,
      pic_name: picName,
      pic_wa: picWa,
      task_title: String(formData.get("task_title") || ""),
      task_description: String(formData.get("task_description") || ""),
      repeat_type: repeatType,
      repeat_days: repeatDays,
      repeat_time: String(formData.get("repeat_time") || "08:00"),
      deadline_time: String(formData.get("deadline_time") || "17:00"),
      requires_photo: requiresPhoto,
    };

    startTransition(async () => {
      const res = await fetch("/api/recurring-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || json.success === false) {
        toast({
          title: "Gagal membuat template",
          description: json.error || "Coba lagi",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Template dibuat" });
      setDialogOpen(false);
      router.refresh();
    });
  }

  function onRepeatTypeChange(value: string) {
    setRepeatType(value);
    setRepeatDays(defaultDays(value));
  }

  function toggleDay(day: string) {
    setRepeatDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Tugas Berulang</h2>
          <p className="text-sm text-muted-foreground">
            {templates.length} template · {activeCount} aktif
          </p>
        </div>
        <Button type="button" onClick={openCreateDialog}>
          <Plus className="mr-2 size-4" />
          Buat Template
        </Button>
      </div>

      <Card className="border-blue-200 bg-blue-50/80 p-3 dark:border-blue-900 dark:bg-blue-950/30">
        <div className="flex items-start gap-2 text-sm text-blue-900 dark:text-blue-100">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>
            Setiap template punya checklist item. Klik{" "}
            <strong>Checklist</strong> pada kartu untuk expand dan edit item
            langsung di sini — seperti di v1.
          </p>
        </div>
      </Card>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="mx-auto mb-4 size-12 text-muted-foreground" />
            <h3 className="mb-1 font-medium">Belum ada template</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Buat template tugas berulang atau jalankan migrasi dari v1
            </p>
            <Button type="button" onClick={openCreateDialog}>
              <Plus className="mr-2 size-4" />
              Buat Template Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => {
            const checklistOpen = openChecklistId === template.template_id;
            return (
              <Card
                key={template.template_id}
                className={!template.active_status ? "opacity-60" : undefined}
              >
                <CardContent className="p-0">
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold leading-tight">
                            {template.template_name}
                          </h3>
                          {!template.active_status ? (
                            <Badge variant="secondary">Nonaktif</Badge>
                          ) : null}
                          <Badge variant="outline">
                            v{template.template_version}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {template.task_title}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3.5" />
                            {template.outlet} · {template.area || "—"}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <User className="size-3.5" />
                            {template.pic_name}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="size-3.5" />
                            {repeatLabel(template)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3.5" />
                            {template.repeat_time} – {template.deadline_time}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <label className="flex items-center gap-2 text-xs">
                          <Switch
                            checked={template.active_status}
                            disabled={pending}
                            onCheckedChange={() => toggleActive(template)}
                          />
                          Aktif
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={checklistOpen ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setOpenChecklistId(
                            checklistOpen ? null : template.template_id,
                          )
                        }
                      >
                        <ListChecks className="mr-1.5 size-4" />
                        Checklist
                      </Button>
                    </div>
                  </div>

                  <ChecklistInlinePanel
                    templateId={template.template_id}
                    open={checklistOpen}
                    onOpenChange={(open) =>
                      setOpenChecklistId(open ? template.template_id : null)
                    }
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Template Berulang</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template_name">Nama Template</Label>
              <Input id="template_name" name="template_name" required />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Outlet</Label>
                <Select
                  value={formOutlet}
                  onValueChange={(value) => {
                    setFormOutlet(value);
                    setPicName("");
                    setPicWa("");
                    const nextAreas = areas.filter(
                      (a) =>
                        !a.outlet ||
                        a.outlet.toUpperCase() === value.toUpperCase(),
                    );
                    setFormArea(nextAreas[0]?.value ?? "");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih outlet" />
                  </SelectTrigger>
                  <SelectContent>
                    {outlets.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Area</Label>
                <Select value={formArea} onValueChange={setFormArea}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih area" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAreas.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>PIC (Staff)</Label>
              <Select
                value={picName}
                onValueChange={(name) => {
                  const selected = filteredStaff.find((s) => s.name === name);
                  setPicName(selected?.name ?? "");
                  setPicWa(selected?.wa_number ?? "");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih staff…" />
                </SelectTrigger>
                <SelectContent>
                  {filteredStaff.map((s) => (
                    <SelectItem key={s.staff_id} value={s.name}>
                      {s.name} · {s.wa_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task_title">Judul Tugas</Label>
              <Input id="task_title" name="task_title" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task_description">Deskripsi</Label>
              <Textarea id="task_description" name="task_description" rows={3} />
            </div>

            <div className="space-y-2">
              <Label>Pengulangan</Label>
              <Select value={repeatType} onValueChange={onRepeatTypeChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPEAT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {repeatType === "weekly" || repeatType === "custom" ? (
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      repeatDays.includes(day.value)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="repeat_time">Waktu Mulai</Label>
                <Input
                  id="repeat_time"
                  name="repeat_time"
                  type="time"
                  defaultValue="08:00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline_time">Deadline</Label>
                <Input
                  id="deadline_time"
                  name="deadline_time"
                  type="time"
                  defaultValue="17:00"
                  required
                />
              </div>
            </div>

            <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span className="text-sm">Wajib foto bukti</span>
              <Switch
                checked={requiresPhoto}
                onCheckedChange={setRequiresPhoto}
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={pending || !picName || !picWa}>
                {pending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Menyimpan…
                  </>
                ) : (
                  "Simpan"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

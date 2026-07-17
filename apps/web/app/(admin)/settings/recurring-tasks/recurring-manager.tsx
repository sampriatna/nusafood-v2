"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { RecurringTemplate, Staff } from "@nusafood/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

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
  "senin",
  "selasa",
  "rabu",
  "kamis",
  "jumat",
  "sabtu",
  "minggu",
] as const;

function repeatLabel(template: RecurringTemplate): string {
  const opt = REPEAT_OPTIONS.find((o) => o.value === template.repeat_type);
  if (template.repeat_type === "weekly" && template.repeat_days.length) {
    return `${opt?.label ?? template.repeat_type} (${template.repeat_days.join(", ")})`;
  }
  return opt?.label ?? template.repeat_type;
}

function defaultDays(repeatType: string): string[] {
  if (repeatType === "weekdays") return DAYS.slice(0, 5);
  if (repeatType === "weekly") return ["senin"];
  if (repeatType === "daily") return [...DAYS];
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
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formOutlet, setFormOutlet] = useState(outlets[0]?.value ?? "KBU");
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

  function toggleActive(templateId: string) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/recurring-templates/${templateId}/toggle`, {
        method: "PATCH",
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || json.success === false) {
        setError(json.error || "Gagal mengubah status");
        return;
      }
      router.refresh();
    });
  }

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    const payload = {
      template_name: String(formData.get("template_name") || ""),
      outlet: formOutlet,
      area: String(formData.get("area") || ""),
      category: String(formData.get("category") || ""),
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
        setError(json.error || "Gagal membuat template");
        return;
      }
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {templates.length} template ·{" "}
          {templates.filter((t) => t.active_status).length} aktif
        </p>
        <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
          Buat Template
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada template. Buat template baru atau jalankan migrasi dari v1.
        </p>
      ) : (
        <ul className="space-y-3">
          {templates.map((template) => (
            <li
              key={template.template_id}
              className="rounded-lg border border-border bg-card p-4 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{template.template_name}</p>
                    {!template.active_status ? (
                      <Badge variant="secondary">Nonaktif</Badge>
                    ) : null}
                    <Badge variant="outline">v{template.template_version}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {template.task_title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {template.outlet} · {template.area || "—"} ·{" "}
                    {template.pic_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {repeatLabel(template)} · {template.repeat_time} –{" "}
                    {template.deadline_time}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={template.active_status}
                    disabled={pending}
                    onCheckedChange={() => toggleActive(template.template_id)}
                  />
                  Aktif
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/checklist-template/${template.template_id}`}>
                    Edit Checklist
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
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
                <Label htmlFor="outlet">Outlet</Label>
                <select
                  id="outlet"
                  value={formOutlet}
                  onChange={(e) => {
                    setFormOutlet(e.target.value);
                    setPicName("");
                    setPicWa("");
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {outlets.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="area">Area</Label>
                <select
                  id="area"
                  name="area"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue={filteredAreas[0]?.value ?? ""}
                >
                  {filteredAreas.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              <select
                id="category"
                name="category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue={categories[0]?.value ?? ""}
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pic">PIC (Staff)</Label>
              <select
                id="pic"
                value={picName}
                onChange={(e) => {
                  const selected = filteredStaff.find(
                    (s) => s.name === e.target.value,
                  );
                  setPicName(selected?.name ?? "");
                  setPicWa(selected?.wa_number ?? "");
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="">Pilih staff…</option>
                {filteredStaff.map((s) => (
                  <option key={s.staff_id} value={s.name}>
                    {s.name} · {s.wa_number}
                  </option>
                ))}
              </select>
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
              <Label htmlFor="repeat_type">Pengulangan</Label>
              <select
                id="repeat_type"
                value={repeatType}
                onChange={(e) => onRepeatTypeChange(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {REPEAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {repeatType === "weekly" || repeatType === "custom" ? (
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <label
                    key={day}
                    className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs capitalize"
                  >
                    <Checkbox
                      checked={repeatDays.includes(day)}
                      onCheckedChange={() => toggleDay(day)}
                    />
                    {day}
                  </label>
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
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={requiresPhoto}
                onCheckedChange={(v) => setRequiresPhoto(v === true)}
              />
              Wajib foto bukti
            </label>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={pending || !picName || !picWa}>
                {pending ? "Menyimpan…" : "Simpan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

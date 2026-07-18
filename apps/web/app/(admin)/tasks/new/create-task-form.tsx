"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Staff } from "@nusafood/types";
import { Send, User } from "lucide-react";
import { PhotoUploader } from "@/components/photo-uploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type Option = { value: string; label: string; outlet?: string | null };

type Props = {
  outlets: Option[];
  areas: Option[];
  categories: Option[];
  staff: Staff[];
};

export function CreateTaskForm({ outlets, areas, categories, staff }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState(false);
  const [outlet, setOutlet] = useState(outlets[0]?.value ?? "KBU");
  const [area, setArea] = useState("");
  const [category, setCategory] = useState(categories[0]?.value ?? "");
  const [priority, setPriority] = useState("Medium");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [picName, setPicName] = useState("");
  const [picWa, setPicWa] = useState("");
  const [beforePhotoPreview, setBeforePhotoPreview] = useState<string | undefined>();

  const filteredAreas = useMemo(
    () =>
      areas.filter(
        (a) => !a.outlet || a.outlet.toUpperCase() === outlet.toUpperCase(),
      ),
    [areas, outlet],
  );

  const filteredStaff = useMemo(
    () =>
      staff.filter(
        (s) =>
          s.status === "ACTIVE" &&
          String(s.outlet).toUpperCase() === outlet.toUpperCase(),
      ),
    [staff, outlet],
  );

  const effectiveArea = area || filteredAreas[0]?.value || "";

  function onOutletChange(value: string) {
    setOutlet(value);
    setSelectedStaffId("");
    setPicName("");
    setPicWa("");
    const nextAreas = areas.filter(
      (a) => !a.outlet || a.outlet.toUpperCase() === value.toUpperCase(),
    );
    setArea(nextAreas[0]?.value ?? "");
  }

  function onStaffChange(staffId: string) {
    setSelectedStaffId(staffId);
    const selected = filteredStaff.find((s) => s.staff_id === staffId);
    setPicName(selected?.name ?? "");
    setPicWa(selected?.wa_number ?? "");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!picName.trim() || !picWa.trim()) {
      setError("Pilih staff atau isi nama dan nomor WA PIC");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const deadlineLocal = String(formData.get("deadline") || "");
    let deadline = "";
    if (deadlineLocal) {
      const parsed = new Date(deadlineLocal);
      if (Number.isNaN(parsed.getTime())) {
        setError("Deadline tidak valid");
        return;
      }
      deadline = parsed.toISOString();
    }

    const payload = {
      outlet,
      area: effectiveArea,
      category,
      task_title: String(formData.get("task_title") || ""),
      task_description: String(formData.get("task_description") || ""),
      priority,
      pic_name: picName.trim(),
      pic_wa: picWa.trim(),
      deadline,
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        });

        const raw = await res.text();
        let json: {
          success: boolean;
          data?: { task_id: string };
          error?: string;
        };
        try {
          json = JSON.parse(raw) as typeof json;
        } catch {
          setError(
            res.ok
              ? "Respons server tidak valid"
              : `Server error (${res.status}). Coba lagi atau hubungi admin.`,
          );
          return;
        }

        if (!json.success || !json.data?.task_id) {
          setError(json.error || "Gagal membuat tugas");
          return;
        }

        const taskId = json.data.task_id;

        if (beforePhotoPreview) {
          const blob = await (await fetch(beforePhotoPreview)).blob();
          const photoForm = new FormData();
          photoForm.append("file", blob, "before.jpg");
          photoForm.append("task_id", taskId);
          photoForm.append("context", "before");

          const uploadRes = await fetch("/api/uploads/photo", {
            method: "POST",
            credentials: "same-origin",
            body: photoForm,
          });
          const uploadRaw = await uploadRes.text();
          let uploadJson: { success: boolean; error?: string };
          try {
            uploadJson = JSON.parse(uploadRaw) as typeof uploadJson;
          } catch {
            setError(
              uploadRes.ok
                ? "Tugas dibuat, tapi upload foto before gagal (respons tidak valid)"
                : `Tugas dibuat, tapi upload foto before gagal (${uploadRes.status})`,
            );
            return;
          }
          if (!uploadJson.success) {
            setError(
              uploadJson.error ||
                "Tugas dibuat, tapi upload foto before gagal. Coba dari halaman detail.",
            );
            return;
          }
        }

        router.push(`/tasks/${taskId}`);
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : "Tidak bisa menghubungi server";
        setError(
          message.includes("fetch")
            ? "Tidak bisa menghubungi server. Cek koneksi internet."
            : message || "Tidak bisa menghubungi server",
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lokasi & Kategori</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Outlet *</Label>
            <Select value={outlet} onValueChange={onOutletChange}>
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
            <Label>Area *</Label>
            <Select value={effectiveArea} onValueChange={setArea}>
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
          <div className="space-y-2">
            <Label>Kategori *</Label>
            <Select value={category} onValueChange={setCategory}>
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
            <Label>Prioritas *</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Detail Tugas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task_title">Judul Tugas *</Label>
            <Input
              id="task_title"
              name="task_title"
              required
              placeholder="Contoh: Bersihkan Kitchen Hood"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task_description">Deskripsi Tugas</Label>
            <Textarea
              id="task_description"
              name="task_description"
              rows={4}
              placeholder="Jelaskan detail tugas yang harus dikerjakan…"
            />
          </div>
          <PhotoUploader
            label="Foto Before (opsional)"
            value={beforePhotoPreview}
            onChange={setBeforePhotoPreview}
          />
          <p className="text-xs text-muted-foreground">
            Foto kondisi sebelum tugas dikerjakan. Kosongkan jika tidak perlu.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Penanggung Jawab</CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="manual-input" className="text-xs font-normal">
                Input Manual
              </Label>
              <Switch
                id="manual-input"
                checked={manualInput}
                onCheckedChange={(checked) => {
                  setManualInput(checked);
                  if (!checked) {
                    setPicName("");
                    setPicWa("");
                    setSelectedStaffId("");
                  }
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!manualInput ? (
            <div className="space-y-2">
              <Label>Pilih Staff *</Label>
              <Select value={selectedStaffId} onValueChange={onStaffChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih staff" />
                </SelectTrigger>
                <SelectContent>
                  {filteredStaff.map((s) => (
                    <SelectItem key={s.staff_id} value={s.staff_id}>
                      {s.name} · {s.wa_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filteredStaff.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Belum ada staff aktif di outlet ini. Aktifkan Input Manual atau
                  tambah staff di Pengaturan.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pic_name">Nama PIC *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="pic_name"
                  value={picName}
                  onChange={(e) => setPicName(e.target.value)}
                  readOnly={!manualInput}
                  required
                  className="pl-9"
                  placeholder="Nama staff"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pic_wa">Nomor WA *</Label>
              <Input
                id="pic_wa"
                value={picWa}
                onChange={(e) => setPicWa(e.target.value)}
                readOnly={!manualInput}
                required
                placeholder="628xxxxxxxxxx"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline *</Label>
            <Input
              id="deadline"
              name="deadline"
              type="datetime-local"
              required
            />
          </div>
        </CardContent>
      </Card>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          "Menyimpan…"
        ) : (
          <>
            <Send className="mr-2 size-4" />
            Buat Tugas & Kirim WA
          </>
        )}
      </Button>
    </form>
  );
}

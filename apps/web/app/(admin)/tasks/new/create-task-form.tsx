"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Option = { value: string; label: string };

type Props = {
  outlets: Option[];
  areas: Option[];
  categories: Option[];
};

export function CreateTaskForm({ outlets, areas, categories }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    const deadlineLocal = String(formData.get("deadline") || "");
    const deadline = deadlineLocal
      ? new Date(deadlineLocal).toISOString()
      : "";

    const payload = {
      outlet: String(formData.get("outlet") || ""),
      area: String(formData.get("area") || ""),
      category: String(formData.get("category") || ""),
      task_title: String(formData.get("task_title") || ""),
      task_description: String(formData.get("task_description") || ""),
      priority: String(formData.get("priority") || "Medium"),
      pic_name: String(formData.get("pic_name") || ""),
      pic_wa: String(formData.get("pic_wa") || ""),
      deadline,
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json()) as {
          success: boolean;
          data?: { task_id: string };
          error?: string;
        };
        if (!json.success || !json.data?.task_id) {
          setError(json.error || "Gagal membuat tugas");
          return;
        }
        router.push(`/tasks/${json.data.task_id}`);
        router.refresh();
      } catch {
        setError("Tidak bisa menghubungi server");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="outlet">Outlet</Label>
          <select
            id="outlet"
            name="outlet"
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            defaultValue={outlets[0]?.value}
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
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            defaultValue={areas[0]?.value}
          >
            {areas.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Kategori</Label>
          <select
            id="category"
            name="category"
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            defaultValue={categories[0]?.value}
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">Prioritas</Label>
          <select
            id="priority"
            name="priority"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            defaultValue="Medium"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="task_title">Judul tugas</Label>
        <Input id="task_title" name="task_title" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task_description">Deskripsi</Label>
        <Textarea id="task_description" name="task_description" rows={4} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pic_name">Nama PIC</Label>
          <Input id="pic_name" name="pic_name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pic_wa">WA PIC</Label>
          <Input
            id="pic_wa"
            name="pic_wa"
            required
            placeholder="628xxxxxxxxxx"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="deadline">Deadline</Label>
        <Input id="deadline" name="deadline" type="datetime-local" required />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : "Buat tugas"}
      </Button>
    </form>
  );
}

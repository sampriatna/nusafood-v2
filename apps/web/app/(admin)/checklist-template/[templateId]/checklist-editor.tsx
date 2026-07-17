"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ChecklistItem } from "@nusafood/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EditableItem = {
  key: string;
  checklist_item_id?: string;
  item_text: string;
  requires_photo: boolean;
  is_required: boolean;
  active_status: boolean;
};

type Props = {
  templateId: string;
  initialItems: ChecklistItem[];
};

function toEditable(items: ChecklistItem[]): EditableItem[] {
  return items.map((item) => ({
    key: item.checklist_item_id,
    checklist_item_id: item.checklist_item_id,
    item_text: item.item_text,
    requires_photo: item.requires_photo,
    is_required: item.is_required,
    active_status: item.active_status,
  }));
}

export function ChecklistEditor({ templateId, initialItems }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [items, setItems] = useState<EditableItem[]>(() =>
    toEditable(initialItems),
  );

  function updateItem(index: number, patch: Partial<EditableItem>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}-${prev.length}`,
        item_text: "",
        requires_photo: false,
        is_required: true,
        active_status: true,
      },
    ]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function moveItem(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    setItems((prev) => {
      const copy = [...prev];
      const [row] = copy.splice(index, 1);
      copy.splice(next, 0, row!);
      return copy;
    });
  }

  function saveItems() {
    setError(null);
    setMessage(null);

    const trimmed = items.map((item) => item.item_text.trim());
    if (trimmed.some((text) => !text)) {
      setError("Semua item harus berisi teks");
      return;
    }

    const payload = items.map((item, index) => ({
      checklist_item_id: item.checklist_item_id,
      item_order: index + 1,
      item_text: item.item_text.trim(),
      requires_photo: item.requires_photo,
      is_required: item.is_required,
      active_status: item.active_status,
    }));

    startTransition(async () => {
      const res = await fetch(`/api/checklist-templates/${templateId}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || json.success === false) {
        setError(json.error || "Gagal menyimpan checklist");
        return;
      }
      setMessage("Checklist disimpan");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{items.length} item</p>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          Tambah Item
        </Button>
      </div>

      <ul className="space-y-3">
        {items.map((item, index) => (
          <li
            key={item.key}
            className="rounded-lg border border-border bg-card p-3 space-y-3"
          >
            <div className="flex items-start gap-2">
              <span className="mt-2 text-xs font-medium text-muted-foreground">
                {index + 1}.
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <Input
                  value={item.item_text}
                  onChange={(e) =>
                    updateItem(index, { item_text: e.target.value })
                  }
                  placeholder="Teks checklist…"
                />
                <div className="flex flex-wrap gap-4 text-xs">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={item.requires_photo}
                      onCheckedChange={(v) =>
                        updateItem(index, { requires_photo: v === true })
                      }
                    />
                    Foto
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={item.is_required}
                      onCheckedChange={(v) =>
                        updateItem(index, { is_required: v === true })
                      }
                    />
                    Wajib
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={item.active_status}
                      onCheckedChange={(v) =>
                        updateItem(index, { active_status: v === true })
                      }
                    />
                    Aktif
                  </label>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={index === 0}
                  onClick={() => moveItem(index, -1)}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={index === items.length - 1}
                  onClick={() => moveItem(index, 1)}
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                >
                  ✕
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada item. Tambah item checklist untuk template ini.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={pending} onClick={saveItems}>
          {pending ? "Menyimpan…" : "Simpan Checklist"}
        </Button>
      </div>

      {message ? <p className="text-sm text-green-600">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

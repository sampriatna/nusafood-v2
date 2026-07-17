"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Camera, ChevronDown, ChevronUp, Loader2, Save, Trash2 } from "lucide-react";
import type { ChecklistItem } from "@nusafood/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<EditableItem[]>(() =>
    toEditable(initialItems),
  );
  const [dirty, setDirty] = useState(false);

  function patchItem(index: number, updates: Partial<EditableItem>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item)),
    );
    setDirty(true);
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
    setDirty(true);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
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
    setDirty(true);
  }

  function saveItems() {
    if (items.some((item) => !item.item_text.trim())) {
      toast({
        title: "Validasi gagal",
        description: "Semua item harus memiliki teks",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/checklist-templates/${templateId}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item, index) => ({
            checklist_item_id: item.checklist_item_id,
            item_order: index + 1,
            item_text: item.item_text.trim(),
            requires_photo: item.requires_photo,
            is_required: item.is_required,
            active_status: item.active_status,
          })),
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || json.success === false) {
        toast({
          title: "Gagal menyimpan",
          description: json.error || "Checklist tidak tersimpan",
          variant: "destructive",
        });
        return;
      }
      setDirty(false);
      toast({ title: "Checklist disimpan" });
      router.refresh();
    });
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">
            Item Checklist{" "}
            <span className="font-normal text-muted-foreground">
              ({items.length})
            </span>
          </p>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            Tambah Item
          </Button>
        </div>

        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={item.key}
              className="rounded-xl border border-border bg-card p-3 shadow-xs"
            >
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-0.5 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={index === 0}
                    onClick={() => moveItem(index, -1)}
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(index, 1)}
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                </div>
                <span className="mt-2 w-6 text-center text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-3">
                  <Input
                    value={item.item_text}
                    onChange={(e) =>
                      patchItem(index, { item_text: e.target.value })
                    }
                    placeholder="Teks item checklist…"
                  />
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
                    <label className="flex items-center gap-2">
                      <Switch
                        checked={item.requires_photo}
                        onCheckedChange={(v) =>
                          patchItem(index, { requires_photo: v })
                        }
                      />
                      <Camera className="size-3.5" />
                      Foto
                    </label>
                    <label className="flex items-center gap-2">
                      <Switch
                        checked={item.is_required}
                        onCheckedChange={(v) =>
                          patchItem(index, { is_required: v })
                        }
                      />
                      Wajib
                    </label>
                    <label className="flex items-center gap-2">
                      <Switch
                        checked={item.active_status}
                        onCheckedChange={(v) =>
                          patchItem(index, { active_status: v })
                        }
                      />
                      Aktif
                    </label>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>

        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Belum ada item checklist.
          </p>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex max-w-2xl flex-wrap gap-2">
          <Button
            type="button"
            className="flex-1 sm:flex-none"
            disabled={pending || !dirty}
            onClick={saveItems}
          >
            {pending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Simpan Checklist
          </Button>
          <Button asChild variant="outline" className="flex-1 sm:flex-none">
            <Link href="/settings/recurring-tasks">Kembali</Link>
          </Button>
        </div>
      </div>
    </>
  );
}

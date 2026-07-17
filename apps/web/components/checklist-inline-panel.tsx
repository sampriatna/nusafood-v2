"use client";

import { useState, useTransition } from "react";
import { Camera, Loader2, Plus, Save, Trash2 } from "lucide-react";
import type { ChecklistItem } from "@nusafood/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function ChecklistInlinePanel({ templateId, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [dirty, setDirty] = useState(false);

  async function loadItems() {
    if (loaded || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/checklist-templates/${templateId}`);
      const json = (await res.json()) as {
        success?: boolean;
        data?: { items?: ChecklistItem[] };
        error?: string;
      };
      if (!res.ok || !json.data) {
        throw new Error(json.error || "Gagal memuat checklist");
      }
      setItems(toEditable(json.data.items ?? []));
      setLoaded(true);
    } catch (error) {
      toast({
        title: "Gagal memuat checklist",
        description:
          error instanceof Error ? error.message : "Terjadi kesalahan",
        variant: "destructive",
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  if (open && !loaded && !loading) {
    void loadItems();
  }

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
        key: `new-${Date.now()}`,
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

  function save() {
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
      setLoaded(false);
      toast({
        title: "Berhasil",
        description: `${items.length} item checklist disimpan`,
      });
    });
  }

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleContent className="border-t border-border bg-muted/20 px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Memuat item checklist…
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                Item Checklist ({items.length})
              </p>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-1 size-3.5" />
                Tambah
              </Button>
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada item. Klik Tambah untuk mulai.
              </p>
            ) : (
              <ul className="space-y-2">
                {items.map((item, index) => (
                  <li
                    key={item.key}
                    className="rounded-lg border border-border bg-card p-3 space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-2 text-xs font-semibold text-muted-foreground">
                        {index + 1}
                      </span>
                      <Input
                        value={item.item_text}
                        onChange={(e) =>
                          patchItem(index, { item_text: e.target.value })
                        }
                        placeholder="Teks item checklist…"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <div className="ml-6 flex flex-wrap gap-x-4 gap-y-2 text-xs">
                      <label className="flex items-center gap-2">
                        <Switch
                          checked={item.requires_photo}
                          onCheckedChange={(v) =>
                            patchItem(index, { requires_photo: v })
                          }
                        />
                        <Camera className="size-3.5 text-muted-foreground" />
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
                  </li>
                ))}
              </ul>
            )}

            {dirty ? (
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={save}
                className="w-full sm:w-auto"
              >
                {pending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                Simpan Checklist
              </Button>
            ) : null}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

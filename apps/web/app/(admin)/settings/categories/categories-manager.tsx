"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type CategoryRow = { id: string; name: string };

type Props = {
  categories: CategoryRow[];
  canManage: boolean;
};

export function CategoriesManager({ categories, canManage }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");

  function addCategory() {
    if (!name.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || json.success === false) {
        toast({
          title: "Gagal menambah kategori",
          description: json.error || "Coba lagi",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Kategori ditambahkan", description: name.trim() });
      setName("");
      router.refresh();
    });
  }

  function removeCategory(category: CategoryRow) {
    startTransition(async () => {
      const res = await fetch(
        `/api/categories/${encodeURIComponent(category.name)}`,
        { method: "DELETE" },
      );
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || json.success === false) {
        toast({
          title: "Gagal menghapus kategori",
          description: json.error || "Coba lagi",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Kategori dihapus", description: category.name });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label>Nama Kategori</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Cleaning, Kitchen, …"
              />
            </div>
            <Button onClick={addCategory} disabled={pending || !name.trim()}>
              {pending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Plus className="mr-2 size-4" />
              )}
              Tambah
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {categories.map((category) => (
            <div
              key={category.name}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <span className="font-medium">{category.name}</span>
              {canManage ? (
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={pending}
                  onClick={() => removeCategory(category)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              ) : null}
            </div>
          ))}
          {categories.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Belum ada kategori.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

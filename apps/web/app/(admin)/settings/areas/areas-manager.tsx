"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type AreaRow = {
  id: string;
  name: string;
  outlet: string | null;
  outlet_name: string | null;
};

type Option = { value: string; label: string };

type Props = {
  areas: AreaRow[];
  outlets: Option[];
  canManage: boolean;
};

export function AreasManager({ areas, outlets, canManage }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [outlet, setOutlet] = useState(outlets[0]?.value ?? "KBU");
  const [name, setName] = useState("");

  function addArea() {
    if (!name.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlet, name: name.trim() }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || json.success === false) {
        toast({
          title: "Gagal menambah area",
          description: json.error || "Coba lagi",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Area ditambahkan", description: name.trim() });
      setName("");
      router.refresh();
    });
  }

  function removeArea(area: AreaRow) {
    if (!area.outlet) return;
    startTransition(async () => {
      const res = await fetch(
        `/api/areas/${encodeURIComponent(area.name)}?outlet=${encodeURIComponent(area.outlet!)}`,
        { method: "DELETE" },
      );
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || json.success === false) {
        toast({
          title: "Gagal menghapus area",
          description: json.error || "Coba lagi",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Area dihapus", description: area.name });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <Card>
          <CardContent className="grid gap-4 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="space-y-2">
              <Label>Outlet</Label>
              <Select value={outlet} onValueChange={setOutlet}>
                <SelectTrigger>
                  <SelectValue />
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
              <Label>Nama Area</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dapur, Bar, …"
              />
            </div>
            <Button onClick={addArea} disabled={pending || !name.trim()}>
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
          {areas.map((area) => (
            <div
              key={`${area.outlet ?? "all"}-${area.name}`}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{area.name}</p>
                <p className="text-xs text-muted-foreground">
                  {area.outlet_name ?? area.outlet ?? "—"}
                </p>
              </div>
              {canManage && area.outlet ? (
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={pending}
                  onClick={() => removeArea(area)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              ) : null}
            </div>
          ))}
          {areas.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Belum ada area.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

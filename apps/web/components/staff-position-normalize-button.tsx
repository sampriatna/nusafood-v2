"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Props = {
  canManage: boolean;
};

type NormalizeResult = {
  total?: number;
  updated?: number;
  unchanged?: number;
  unresolved?: Array<{ staff_id: string; name: string; position: string | null }>;
};

export function StaffPositionNormalizeButton({ canManage }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  if (!canManage) return null;

  function runNormalize() {
    startTransition(async () => {
      setResult(null);
      const res = await fetch("/api/staff/normalize-positions", {
        method: "POST",
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: NormalizeResult;
      };

      if (!res.ok || json.success === false) {
        toast({
          title: "Normalisasi gagal",
          description: json.error || "Coba lagi",
          variant: "destructive",
        });
        return;
      }

      const data = json.data;
      const summary = [
        data?.updated != null ? `${data.updated} diperbarui` : null,
        data?.unchanged != null ? `${data.unchanged} sudah benar` : null,
        data?.unresolved?.length
          ? `${data.unresolved.length} perlu edit manual`
          : null,
      ]
        .filter(Boolean)
        .join(" · ");

      setResult(summary);
      toast({
        title: "Jabatan staff dinormalisasi",
        description: summary || "Selesai",
      });
      router.refresh();
    });
  }

  return (
    <Card className="border-amber-200/80 bg-amber-50/80">
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="font-semibold">Samakan Jabatan dengan Posisi Kegiatan</p>
          <p className="text-sm text-muted-foreground">
            Konversi otomatis jabatan lama (teks bebas) ke posisi standar — mis.
            &quot;Public Area&quot; → PA, &quot;Kasir&quot; → Kasir. Staff yang
            tidak bisa dipetakan perlu diedit manual.
          </p>
        </div>
        <Button
          onClick={runNormalize}
          disabled={pending}
          variant="outline"
          className="w-full bg-background sm:w-auto"
        >
          {pending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Link2 className="mr-2 size-4" />
          )}
          Normalisasi Jabatan Staff
        </Button>
        {result ? (
          <p className="text-sm text-muted-foreground">{result}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

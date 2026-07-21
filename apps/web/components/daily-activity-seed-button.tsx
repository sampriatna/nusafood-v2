"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Database, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Props = {
  canManage: boolean;
  compact?: boolean;
};

type SeedResult = {
  templates?: number;
  codes?: string[];
  position_groups?: string[];
};

function formatSummary(data?: SeedResult): string {
  if (!data) return "";
  const parts: string[] = [];
  if (data.templates != null) {
    parts.push(`${data.templates} template`);
  }
  if (data.position_groups?.length) {
    parts.push(`${data.position_groups.length} posisi`);
  }
  return parts.join(" · ");
}

export function DailyActivitySeedButton({ canManage, compact = false }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  if (!canManage) return null;

  function runSeed() {
    startTransition(async () => {
      setResult(null);
      const res = await fetch("/api/staff-reports/templates/seed", {
        method: "POST",
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: SeedResult;
      };

      if (!res.ok || json.success === false) {
        toast({
          title: "Seed gagal",
          description: json.error || "Coba lagi atau cek log server",
          variant: "destructive",
        });
        return;
      }

      const summary = formatSummary(json.data);
      setResult(summary);
      toast({
        title: "Template kegiatan di-seed",
        description:
          summary ||
          "Checklist wajib harian sudah di-update dari seed bawaan sistem",
      });
      router.refresh();
    });
  }

  if (compact) {
    return (
      <Button onClick={runSeed} disabled={pending} variant="outline" size="sm">
        {pending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Database className="mr-2 size-4" />
        )}
        Seed template
      </Button>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="font-semibold">Seed Template Kegiatan Harian</p>
          <p className="text-sm text-muted-foreground">
            Satu klik: import / update semua template SOP + checklist wajib
            (Waiters, Bar, Kasir, Purchasing, Gudang, dll.) ke database.
            Aman dijalankan ulang — data lama di-update, bukan duplikat.
          </p>
        </div>
        <Button onClick={runSeed} disabled={pending} className="w-full sm:w-auto">
          {pending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Database className="mr-2 size-4" />
          )}
          Seed Template Kegiatan
        </Button>
        {result ? (
          <p className="text-sm text-muted-foreground">{result}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

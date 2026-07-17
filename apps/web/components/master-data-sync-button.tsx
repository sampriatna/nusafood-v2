"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Props = {
  canManage: boolean;
};

export function MasterDataSyncButton({ canManage }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  if (!canManage) return null;

  function syncFromV1() {
    startTransition(async () => {
      setResult(null);
      const res = await fetch("/api/master-data/sync-from-gas", {
        method: "POST",
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: {
          staff?: { upserted: number; skipped: number };
          areas?: { upserted: number; skipped: number };
          categories?: { upserted: string[] };
        };
      };

      if (!res.ok || json.success === false) {
        toast({
          title: "Sync gagal",
          description: json.error || "Pastikan GAS_WEB_APP_URL & ADMIN_API_KEY di Vercel",
          variant: "destructive",
        });
        return;
      }

      const staff = json.data?.staff;
      const areas = json.data?.areas;
      const categories = json.data?.categories;
      const summary = [
        staff ? `Staff: ${staff.upserted} ok, ${staff.skipped} skip` : null,
        areas ? `Area: ${areas.upserted} ok, ${areas.skipped} skip` : null,
        categories
          ? `Kategori: ${categories.upserted.length} ok`
          : null,
      ]
        .filter(Boolean)
        .join(" · ");

      setResult(summary);
      toast({ title: "Sync dari v1 selesai", description: summary });
      router.refresh();
    });
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="font-medium">Import dari v1 (GAS)</p>
          <p className="text-sm text-muted-foreground">
            Tarik Master Staff, Area, dan Kategori dari Google Sheets v1 ke
            PostgreSQL v2.
          </p>
        </div>
        <Button onClick={syncFromV1} disabled={pending}>
          {pending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Download className="mr-2 size-4" />
          )}
          Sync dari v1
        </Button>
        {result ? (
          <p className="text-sm text-muted-foreground">{result}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

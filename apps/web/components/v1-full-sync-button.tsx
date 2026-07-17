"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Props = {
  canManage: boolean;
  compact?: boolean;
};

type SyncResult = {
  operational?: {
    tasks?: { upserted: number; skipped: number };
    staff?: { upserted: number; skipped: number };
    areas?: { upserted: number; skipped: number };
    categories?: { upserted: string[] };
  };
  checklist?: {
    recurringTemplates?: { upserted: number; skipped: number };
    checklistTemplates?: { upserted: number; skipped: number };
    checklistItems?: { upserted: number; skipped: number };
  };
};

function formatSummary(data?: SyncResult): string {
  if (!data) return "";
  const parts: string[] = [];
  const op = data.operational;
  const cl = data.checklist;
  if (op?.staff) {
    parts.push(`Staff ${op.staff.upserted}`);
  }
  if (op?.tasks) {
    parts.push(`Tugas ${op.tasks.upserted}`);
  }
  if (op?.areas) {
    parts.push(`Area ${op.areas.upserted}`);
  }
  if (op?.categories) {
    parts.push(`Kategori ${op.categories.upserted.length}`);
  }
  if (cl?.recurringTemplates) {
    parts.push(`Recurring ${cl.recurringTemplates.upserted}`);
  }
  if (cl?.checklistItems) {
    parts.push(`Item checklist ${cl.checklistItems.upserted}`);
  }
  return parts.join(" · ");
}

export function V1FullSyncButton({ canManage, compact = false }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  if (!canManage) return null;

  function syncAll() {
    startTransition(async () => {
      setResult(null);
      const res = await fetch("/api/sync/from-v1", { method: "POST" });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: SyncResult;
      };

      if (!res.ok || json.success === false) {
        toast({
          title: "Sync gagal",
          description:
            json.error ||
            "Pastikan GAS_WEB_APP_URL & ADMIN_API_KEY sudah benar di Vercel",
          variant: "destructive",
        });
        return;
      }

      const summary = formatSummary(json.data);
      setResult(summary);
      toast({
        title: "Sync v1 selesai",
        description: summary || "Data berhasil diimpor",
      });
      router.refresh();
    });
  }

  if (compact) {
    return (
      <Button onClick={syncAll} disabled={pending} variant="outline" size="sm">
        {pending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Download className="mr-2 size-4" />
        )}
        Sync v1
      </Button>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="font-semibold">Sync Semua dari v1</p>
          <p className="text-sm text-muted-foreground">
            Satu klik: staff, area, kategori, tugas, template recurring, dan
            checklist — supaya tampilan 1:1 dengan v1. Jalankan setelah deploy
            atau saat data terasa kosong.
          </p>
        </div>
        <Button onClick={syncAll} disabled={pending} className="w-full sm:w-auto">
          {pending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Download className="mr-2 size-4" />
          )}
          Sync Semua dari v1
        </Button>
        {result ? (
          <p className="text-sm text-muted-foreground">{result}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** @deprecated Use V1FullSyncButton */
export const MasterDataSyncButton = V1FullSyncButton;

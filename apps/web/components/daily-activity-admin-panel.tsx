"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ClipboardList,
  Database,
  FileText,
  Link2,
  Loader2,
  RefreshCw,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getPositionGroupLabel } from "@/lib/position-groups";
import { listPositionDailyTemplateSummary } from "@/lib/daily-activity-seed";
import type { DailyActivitySetupStats } from "@/lib/services/daily-activity-setup.service";

type Props = {
  canManage: boolean;
  stats: DailyActivitySetupStats;
};

const catalog = listPositionDailyTemplateSummary().filter((row) =>
  [
    "Kasir",
    "Purchasing",
    "Gudang",
    "ProduksiFnB",
    "ProduksiNF",
    "Advertising",
    "AdminMP",
    "CSNF",
    "Finance",
    "Design",
  ].includes(row.position),
);

export function DailyActivityAdminPanel({ canManage, stats }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [counts, setCounts] = useState(stats);
  const autoSeedStarted = useRef(false);

  useEffect(() => {
    if (!canManage || counts.template_count > 0 || autoSeedStarted.current) return;
    autoSeedStarted.current = true;

    void fetch("/api/staff-reports/templates/seed", { method: "POST" })
      .then(async (res) => {
        const json = (await res.json()) as {
          success?: boolean;
          error?: string;
          data?: { templates?: number };
        };
        if (!res.ok || json.success === false) {
          toast({
            title: "Import template gagal",
            description: json.error || "Coba tombol Sync template",
            variant: "destructive",
          });
          return;
        }
        setCounts((prev) => ({
          ...prev,
          template_count: json.data?.templates ?? prev.template_count,
        }));
        toast({
          title: "Template kegiatan di-import",
          description: `${json.data?.templates ?? 0} template siap dipakai`,
        });
        router.refresh();
      })
      .catch(() => {
        toast({
          title: "Import template gagal",
          description: "Periksa koneksi lalu coba lagi",
          variant: "destructive",
        });
      });
  }, [canManage, counts.template_count, router, toast]);

  function runAction(path: string, successTitle: string) {
    startTransition(async () => {
      const res = await fetch(path, { method: "POST" });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: Record<string, unknown>;
      };
      if (!res.ok || json.success === false) {
        toast({
          title: "Gagal",
          description: json.error || "Coba lagi",
          variant: "destructive",
        });
        return;
      }
      toast({ title: successTitle, description: "Selesai" });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          icon={FileText}
          label="Template"
          value={counts.template_count}
        />
        <StatCard icon={Link2} label="Link aktif" value={counts.active_link_count} />
        <StatCard icon={Users} label="Staff aktif" value={counts.active_staff_count} />
      </div>

      {canManage ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Setup cepat</p>
              <p className="text-sm text-muted-foreground">
                Sync template SOP + samakan jabatan staff dengan posisi kegiatan.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  runAction(
                    "/api/staff-reports/templates/seed",
                    "Template di-sync",
                  )
                }
              >
                {pending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Database className="mr-2 size-4" />
                )}
                Sync template
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  runAction(
                    "/api/staff/normalize-positions",
                    "Jabatan dinormalisasi",
                  )
                }
              >
                {pending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 size-4" />
                )}
                Normalisasi jabatan
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="text-sm font-semibold">10 posisi back-office (wajib harian)</p>
          <div className="flex flex-wrap gap-2">
            {catalog.map((row) => (
              <Badge key={row.code} variant="secondary" className="font-normal">
                {getPositionGroupLabel(row.position)} · {row.checklist_count} item
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-2 sm:grid-cols-3">
        <QuickLink
          href="/settings/report-templates"
          icon={FileText}
          title="Template"
          description="Edit checklist"
        />
        <QuickLink
          href="/settings/report-links"
          icon={Link2}
          title="Link staff"
          description="Generate /r/nama"
        />
        <QuickLink
          href="/dashboard/daily-reports"
          icon={ClipboardList}
          title="Audit"
          description="Pantau submit"
        />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="size-3.5" />
          {label}
        </div>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof FileText;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border bg-card p-3 transition-colors hover:bg-muted/40"
    >
      <div className="flex items-center gap-2 font-medium">
        <Icon className="size-4 text-primary" />
        {title}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </Link>
  );
}

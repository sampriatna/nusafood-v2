"use client";

import { useEffect, useState } from "react";
import { MobileHeader } from "@/components/mobile-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  fetchStaffList,
  listStaffReportLinks,
  generateStaffReportLink,
  revokeStaffReportLink,
  syncStaffReportStaff,
} from "@/lib/api/daily-report-client";
import type { Staff, StaffReportLink } from "@nusafood/types";
import { Link2, Copy, RefreshCw, Ban, Check } from "lucide-react";

export default function ReportLinksSettingsPage() {
  const { toast } = useToast();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [links, setLinks] = useState<StaffReportLink[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<StaffReportLink | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const staffRes = await fetchStaffList({ status: "ACTIVE" });
      if (staffRes.success && staffRes.data) {
        setStaffList(staffRes.data);
        await syncStaffReportStaff(staffRes.data);
      }
      const linksRes = await listStaffReportLinks();
      if (linksRes.success && linksRes.data) setLinks(linksRes.data);
    } catch {
      toast({
        title: "Error",
        description: "Gagal memuat data link",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeLinks = links.filter((l) => l.is_active);
  const staffWithoutLink = staffList.filter(
    (s) => !activeLinks.some((l) => l.staff_id === s.staff_id)
  );

  const handleGenerate = async () => {
    if (!selectedStaffId) {
      toast({ title: "Pilih staff dulu", variant: "destructive" });
      return;
    }
    setIsWorking(true);
    try {
      // Pastikan store punya staff terbaru sebelum generate
      if (staffList.length > 0) await syncStaffReportStaff(staffList);
      const result = await generateStaffReportLink(selectedStaffId, staffList);
      if (result.success && result.data) {
        toast({ title: "Link dibuat", description: "Link report permanen siap dibagikan" });
        setSelectedStaffId("");
        await load();
      } else {
        toast({
          title: "Gagal",
          description: result.error || "Gagal membuat link",
          variant: "destructive",
        });
      }
    } finally {
      setIsWorking(false);
    }
  };

  const handleCopy = async (link: StaffReportLink) => {
    const url =
      link.report_url ||
      `${window.location.origin}/r/${link.short_code || link.token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(link.id);
      toast({
        title: "Disalin",
        description: `Link pendek: /r/${link.short_code || "…"}`,
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: "Gagal salin", variant: "destructive" });
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setIsWorking(true);
    try {
      const result = await revokeStaffReportLink(revokeTarget.id);
      if (result.success) {
        toast({ title: "Link dinonaktifkan" });
        setRevokeTarget(null);
        await load();
      } else {
        toast({
          title: "Gagal",
          description: result.error || "Gagal menonaktifkan",
          variant: "destructive",
        });
      }
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader
        title="Link Report Staff"
        showBack
        backHref="/settings"
      />

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Buat / Generate Link</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Setiap staff punya link pendek dari nama (contoh /r/dul). Statis sampai dinonaktifkan.
            </p>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih staff..." />
              </SelectTrigger>
              <SelectContent>
                {(staffWithoutLink.length > 0 ? staffWithoutLink : staffList).map((s) => (
                  <SelectItem key={s.staff_id} value={s.staff_id}>
                    {s.name} · {s.outlet} · {s.position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={handleGenerate} disabled={isWorking}>
              {isWorking ? "Memproses..." : "Generate Link"}
            </Button>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <h3 className="font-medium">Link Aktif ({activeLinks.length})</h3>
          <Button variant="ghost" size="sm" onClick={load} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat...</p>
        ) : activeLinks.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              Belum ada link aktif. Generate untuk staff di atas.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeLinks.map((link) => {
              const staff = staffList.find((s) => s.staff_id === link.staff_id);
              const shortPath = `/r/${link.short_code || link.token.slice(0, 8)}`;
              const url =
                link.report_url ||
                `${typeof window !== "undefined" ? window.location.origin : ""}${shortPath}`;
              return (
                <Card key={link.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">
                          {link.staff_name || staff?.name || link.staff_id}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {(link.outlet || staff?.outlet) ?? "—"} ·{" "}
                          {(link.position || staff?.position) ?? "—"}
                        </p>
                      </div>
                      <Badge>Aktif</Badge>
                    </div>

                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 space-y-1">
                      <p className="text-xs text-emerald-800 font-medium">Link pendek (bagi ini)</p>
                      <p className="text-base font-bold text-emerald-900 font-mono break-all">
                        {shortPath}
                      </p>
                      <p className="text-[11px] text-emerald-700/80 break-all">{url}</p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="flex-1 h-11"
                        onClick={() => handleCopy(link)}
                      >
                        {copiedId === link.id ? (
                          <Check className="h-4 w-4 mr-1" />
                        ) : (
                          <Copy className="h-4 w-4 mr-1" />
                        )}
                        Salin link pendek
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1 h-11"
                        onClick={() => setRevokeTarget(link)}
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        Nonaktifkan
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan link?</AlertDialogTitle>
            <AlertDialogDescription>
              Link untuk <strong>{revokeTarget?.staff_name}</strong> tidak bisa dipakai lagi
              untuk submit report. Anda bisa generate link baru kapan saja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} disabled={isWorking}>
              Nonaktifkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

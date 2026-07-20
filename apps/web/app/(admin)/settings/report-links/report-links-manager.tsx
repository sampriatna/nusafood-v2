"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Staff } from "@nusafood/types";
import { Ban, Check, Copy, Link2, Loader2, RefreshCw } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  type DailyActivityApiResponse,
  type StaffReportLink,
} from "@/lib/daily-activity-types";

export function ReportLinksManager() {
  const { toast } = useToast();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [links, setLinks] = useState<StaffReportLink[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<StaffReportLink | null>(
    null,
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [staffRes, linksRes] = await Promise.all([
        fetch("/api/staff?status=ACTIVE", { credentials: "include" }),
        fetch("/api/staff-reports/links", { credentials: "include" }),
      ]);
      const staffJson =
        (await staffRes.json()) as DailyActivityApiResponse<Staff[]>;
      const linksJson =
        (await linksRes.json()) as DailyActivityApiResponse<StaffReportLink[]>;

      if (staffJson.success && staffJson.data) {
        setStaffList(
          staffJson.data.filter((staff) => staff.status === "ACTIVE"),
        );
      } else {
        toast({
          title: "Gagal memuat staff",
          description: staffJson.error || "Coba lagi",
          variant: "destructive",
        });
      }

      if (linksJson.success && linksJson.data) {
        setLinks(linksJson.data);
      } else {
        toast({
          title: "Gagal memuat link",
          description: linksJson.error || "Coba lagi",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Gagal memuat data link",
        description: "Periksa koneksi lalu coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeLinks = useMemo(
    () => links.filter((link) => link.is_active),
    [links],
  );

  const staffWithoutActiveLink = useMemo(
    () =>
      staffList.filter(
        (staff) =>
          !activeLinks.some((link) => link.staff_id === staff.staff_id),
      ),
    [activeLinks, staffList],
  );

  async function handleGenerate() {
    if (!selectedStaffId) {
      toast({ title: "Pilih staff dulu", variant: "destructive" });
      return;
    }

    setIsWorking(true);
    try {
      const res = await fetch("/api/staff-reports/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ staff_id: selectedStaffId }),
      });
      const json =
        (await res.json()) as DailyActivityApiResponse<StaffReportLink>;
      if (!json.success) {
        toast({
          title: "Gagal membuat link",
          description: json.error || "Coba lagi",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Link dibuat",
        description: "Link report permanen siap dibagikan",
      });
      setSelectedStaffId("");
      await load();
    } catch {
      toast({
        title: "Gagal membuat link",
        description: "Periksa koneksi lalu coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsWorking(false);
    }
  }

  async function handleCopy(link: StaffReportLink) {
    const shortPath = `/r/${link.short_code || link.token}`;
    const url =
      link.report_url ||
      `${typeof window !== "undefined" ? window.location.origin : ""}${shortPath}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(link.id);
      toast({ title: "Disalin", description: shortPath });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: "Gagal salin", variant: "destructive" });
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return;

    setIsWorking(true);
    try {
      const res = await fetch(
        `/api/staff-reports/links/${encodeURIComponent(revokeTarget.id)}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      const json =
        (await res.json()) as DailyActivityApiResponse<StaffReportLink>;
      if (!json.success) {
        toast({
          title: "Gagal menonaktifkan",
          description: json.error || "Coba lagi",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Link dinonaktifkan" });
      setRevokeTarget(null);
      await load();
    } catch {
      toast({
        title: "Gagal menonaktifkan",
        description: "Periksa koneksi lalu coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <Link2 className="size-5 text-primary" />
            <h2 className="font-semibold">Buat / Generate Link</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Setiap staff punya link pendek permanen. Bagikan satu kali, lalu
            nonaktifkan jika perlu diganti.
          </p>
          <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih staff..." />
            </SelectTrigger>
            <SelectContent>
              {(staffWithoutActiveLink.length > 0
                ? staffWithoutActiveLink
                : staffList
              ).map((staff) => (
                <SelectItem key={staff.staff_id} value={staff.staff_id}>
                  {staff.name} · {staff.outlet} · {staff.position}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="w-full"
            onClick={() => void handleGenerate()}
            disabled={isWorking}
          >
            {isWorking ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            Generate Link
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="font-medium">Link Aktif ({activeLinks.length})</h3>
        <Button variant="ghost" size="sm" onClick={() => void load()} disabled={isLoading}>
          <RefreshCw className={`mr-1 size-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Memuat link...
          </CardContent>
        </Card>
      ) : activeLinks.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Belum ada link aktif. Generate untuk staff di atas.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activeLinks.map((link) => {
            const staff = staffList.find(
              (member) => member.staff_id === link.staff_id,
            );
            const shortPath = `/r/${link.short_code || link.token}`;
            const url =
              link.report_url ||
              `${typeof window !== "undefined" ? window.location.origin : ""}${shortPath}`;
            return (
              <Card key={link.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">
                        {link.staff_name || staff?.name || link.staff_id}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {link.outlet || staff?.outlet || "-"} ·{" "}
                        {link.position || staff?.position || "-"}
                      </p>
                    </div>
                    <Badge>Aktif</Badge>
                  </div>

                  <div className="space-y-1 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-xs font-medium text-emerald-800">
                      Link pendek (bagi ini)
                    </p>
                    <p className="break-all font-mono text-base font-bold text-emerald-900">
                      {shortPath}
                    </p>
                    <p className="break-all text-[11px] text-emerald-700/80">
                      {url}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="h-11 flex-1"
                      onClick={() => void handleCopy(link)}
                    >
                      {copiedId === link.id ? (
                        <Check className="mr-1 size-4" />
                      ) : (
                        <Copy className="mr-1 size-4" />
                      )}
                      Salin link
                    </Button>
                    <Button
                      variant="destructive"
                      className="h-11 flex-1"
                      onClick={() => setRevokeTarget(link)}
                    >
                      <Ban className="mr-1 size-4" />
                      Nonaktifkan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan link?</AlertDialogTitle>
            <AlertDialogDescription>
              Link untuk{" "}
              <strong>
                {revokeTarget?.staff_name || revokeTarget?.staff_id}
              </strong>{" "}
              tidak bisa dipakai lagi untuk submit report. Anda bisa generate
              link baru kapan saja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleRevoke()} disabled={isWorking}>
              {isWorking ? "Memproses..." : "Nonaktifkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

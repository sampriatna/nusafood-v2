"use client";

import Link from "next/link";
import { MobileHeader } from "@/components/mobile-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Link2,
  FileText,
  ClipboardList,
  ChevronRight,
  Info,
  Layers,
} from "lucide-react";

/**
 * Super Admin hub untuk Daily Activity SOP.
 * Lapisan tambahan — tidak mengganti Task lama.
 */
export default function DailyActivityAdminPage() {
  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Daily Activity SOP" showBack backHref="/settings" />

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 flex gap-3">
            <Info className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 space-y-1">
              <p className="font-semibold">Lapisan tambahan — Task lama tetap jalan</p>
              <p>
                <strong>Task lama:</strong> pekerjaan dari admin/leader (deadline, revisi,
                approval, foto before-after, WA).
              </p>
              <p>
                <strong>Daily Activity:</strong> kegiatan standar harian per SDM via link
                pribadi — checklist + foto + status. Tidak perlu dikirim WA tiap hari.
              </p>
            </div>
          </CardContent>
        </Card>

        <Link href="/settings/report-templates">
          <Card className="mb-3 hover:border-primary/50 transition-colors active:scale-[0.99]">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">Edit Template Kegiatan</h3>
                <p className="text-sm text-muted-foreground">
                  Nama, standar hasil, checklist, foto wajib, jam target, posisi, outlet
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings/report-links">
          <Card className="mb-3 hover:border-primary/50 transition-colors active:scale-[0.99]">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <Link2 className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">Link Permanen Staff</h3>
                <p className="text-sm text-muted-foreground">
                  Generate, salin, atau nonaktifkan /r/[token] per SDM
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/daily-reports">
          <Card className="mb-3 hover:border-primary/50 transition-colors active:scale-[0.99]">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">Dashboard Audit</h3>
                <p className="text-sm text-muted-foreground">
                  % checklist, status kondisi, belum submit, foto & catatan
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/leader-monitoring">
          <Card className="mb-3 hover:border-primary/50 transition-colors active:scale-[0.99] border-slate-300">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">Leader Monitoring</h3>
                <p className="text-sm text-muted-foreground">
                  Cek fisik: Opening, Jam Ramai, Spot Check, Closing, Issue Log
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardContent className="p-4 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Layers className="h-4 w-4" />
              Cara pakai cepat
            </div>
            <ol className="list-decimal list-inside space-y-1">
              <li>Edit / tambah template kegiatan + checklist</li>
              <li>Generate link untuk tiap staff aktif</li>
              <li>Bagikan link (satu kali) — staff pakai tiap hari</li>
              <li>Pantau di Dashboard Audit</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Eye,
  MapPin,
  MessageCircleWarning,
  ShieldCheck,
} from "lucide-react";
import {
  DailyActivityError,
  getStaffReportByToken,
} from "@/lib/services/daily-activity.service";

type Props = {
  params: Promise<{ token: string }>;
};

export const dynamic = "force-dynamic";

export default async function CulturePreviewPage({ params }: Props) {
  const { token } = await params;

  try {
    const data = await getStaffReportByToken(token);

    return (
      <div className="min-h-screen bg-muted/30 pb-10">
        <header className="bg-primary px-4 py-4 text-primary-foreground">
          <div className="mx-auto max-w-lg">
            <p className="mb-0.5 text-sm text-primary-foreground/80">
              SOP Kerja Hari Ini
            </p>
            <h1 className="text-2xl font-bold">{data.staff.name}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-foreground/15 px-2.5 py-1">
                <MapPin className="size-3.5" />
                {data.staff.outlet}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-foreground/15 px-2.5 py-1">
                <Briefcase className="size-3.5" />
                {data.staff.position}
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-lg space-y-4 p-4">
          <div className="rounded-xl border border-dashed bg-card px-3 py-2 text-xs text-muted-foreground">
            PREVIEW SAJA — halaman link staff asli tidak berubah.
          </div>

          <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="border-b bg-amber-50/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-amber-700" />
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-800">
                  Prinsip kerja RUMAH
                </p>
              </div>
            </div>

            <div className="divide-y">
              <div className="flex gap-3 p-4">
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                  <Eye className="size-5" />
                </div>
                <div>
                  <p className="font-bold leading-snug">
                    Yang kamu lihat, kamu pedulikan.
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Kalau melihat masalah, jangan diam. Bantu kalau bisa; laporkan
                    kalau perlu bagian lain. Melaporkan bukan mencari salah — ini
                    bagian dari menjaga rumah.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-4">
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <p className="font-bold leading-snug">
                    Yang kamu terima, kamu tuntaskan.
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Tugas yang masuk jangan hilang di tengah jalan. Selesaikan,
                    atau teruskan ke orang yang tepat dengan status yang jelas.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <MessageCircleWarning className="size-4 text-amber-600" />
              <h2 className="font-bold">Contoh saat dipakai di dalam task</h2>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                Saat melaporkan kendala
              </p>
              <p className="mt-1 text-sm leading-relaxed text-amber-950">
                Yang kamu lihat, kamu pedulikan — laporkan apa adanya agar bisa
                ditindaklanjuti.
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                Saat menerima pekerjaan
              </p>
              <p className="mt-1 text-sm leading-relaxed text-emerald-950">
                Yang kamu terima, kamu tuntaskan — selesaikan atau teruskan dengan
                status yang jelas.
              </p>
            </div>
          </section>

          <p className="px-1 text-center text-xs leading-relaxed text-muted-foreground">
            Kalau konsep ini dipakai, bagian RUMAH cukup tampil satu kali di bawah
            identitas staff. Kalimat pendeknya baru muncul lagi saat konteksnya
            relevan, supaya tidak terasa seperti slogan berulang-ulang.
          </p>

          <Link
            href={`/r/${encodeURIComponent(token)}`}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border bg-card font-semibold shadow-sm active:scale-[0.99]"
          >
            <ArrowLeft className="size-4" />
            Kembali ke link staff asli
          </Link>
        </main>
      </div>
    );
  } catch (error) {
    const message =
      error instanceof DailyActivityError
        ? error.message
        : "Preview tidak dapat dimuat.";

    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-center">
          <h1 className="text-lg font-bold">Preview tidak tersedia</h1>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    );
  }
}

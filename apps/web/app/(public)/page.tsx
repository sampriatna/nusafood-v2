import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const outlets = ["Kopi Buri Umah", "Kisamen", "Samtaro Express"];

const highlights = [
  {
    icon: ClipboardList,
    title: "Tugas & checklist",
    description: "Buat, pantau, dan verifikasi laporan operasional harian.",
  },
  {
    icon: CheckCircle2,
    title: "Laporan staff",
    description: "Staff menerima link WA, upload bukti, tanpa perlu login.",
  },
  {
    icon: Shield,
    title: "Akses per outlet",
    description: "Leader hanya melihat data outlet masing-masing.",
  },
];

export default function HomePage() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "2.0.0";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,oklch(0.93_0.04_45),transparent_45%),radial-gradient(circle_at_bottom_right,oklch(0.93_0.03_145),transparent_40%),oklch(0.985_0.002_240)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-12 sm:py-16">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
              NF
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Nusa Food</p>
              <p className="text-xs text-muted-foreground">Task & Report System</p>
            </div>
          </div>
          <p className="hidden text-xs text-muted-foreground sm:block">
            v{version}
          </p>
        </header>

        <section className="flex flex-1 flex-col justify-center py-10 sm:py-16">
          <div className="mx-auto w-full max-w-2xl space-y-8 text-center">
            <div className="space-y-4">
              <p className="inline-flex items-center rounded-full border border-border/80 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
                Platform operasional internal
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Kelola tugas outlet
                <span className="block text-primary">lebih rapi dan terpantau</span>
              </h1>
              <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Satu tempat untuk leader dan admin membuat tugas, memantau
                progres, serta menyetujui laporan staff di seluruh outlet Nusa
                Food.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="min-w-[180px]">
                <Link href="/login">
                  Masuk dashboard
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-w-[180px] bg-card/60 backdrop-blur-sm">
                <Link href="/api/health">Status sistem</Link>
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {outlets.map((outlet) => (
                <span
                  key={outlet}
                  className="rounded-full bg-muted/70 px-3 py-1 text-xs text-muted-foreground"
                >
                  {outlet}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-4 sm:grid-cols-3">
          {highlights.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="rounded-2xl border border-border/70 bg-card/70 p-5 text-left shadow-sm backdrop-blur-sm"
            >
              <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </article>
          ))}
        </section>

        <footer className="border-t border-border/60 pt-6 text-center text-xs text-muted-foreground sm:text-left">
          <p>
            Staff tidak perlu login — cukup buka link dari WhatsApp untuk
            melaporkan tugas.
          </p>
          <p className="mt-1 sm:hidden">Versi {version}</p>
        </footer>
      </div>
    </main>
  );
}

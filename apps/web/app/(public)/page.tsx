import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto max-w-lg space-y-6">
        <p className="text-sm font-medium text-muted-foreground">
          Nusa Food Task System
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          TaskNF3 v2
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          Scaffold awal monorepo v2. Produksi v1 tetap jalan; staging v2 dibangun
          bertahap sesuai docs migrasi.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Login leader
          </Link>
          <Link
            href="/api/health"
            className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium text-foreground"
          >
            Health check
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Version {process.env.NEXT_PUBLIC_APP_VERSION ?? "2.0.0"} · Sprint 1
          fondasi
        </p>
      </div>
    </main>
  );
}

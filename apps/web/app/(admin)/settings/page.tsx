import Link from "next/link";

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">
          Master data staff, area, kategori, user — Sprint 2 & 6.
        </p>
        <ul className="space-y-2 text-sm">
          <li>
            <Link href="/settings/sync-logs" className="hover:underline">
              Sync logs (dual-write monitoring)
            </Link>
          </li>
          <li>
            <Link href="/settings/staff" className="hover:underline">
              Staff
            </Link>
          </li>
          <li>
            <Link href="/settings/areas" className="hover:underline">
              Areas
            </Link>
          </li>
          <li>
            <Link href="/settings/categories" className="hover:underline">
              Categories
            </Link>
          </li>
        </ul>
      </div>
    </main>
  );
}

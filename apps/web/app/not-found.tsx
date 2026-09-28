import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <SearchX className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-bold">Halaman tidak ditemukan</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Link salah, datanya sudah dihapus, atau data ini milik outlet lain yang bukan akses akun Anda.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Kembali ke Dashboard</Link>
      </Button>
    </main>
  );
}

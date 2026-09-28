"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[page error]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-8 text-destructive" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-bold">Halaman gagal dimuat</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Biasanya karena koneksi atau server sedang sibuk. Coba lagi sebentar; data Anda tidak hilang.
        </p>
        {error.digest ? (
          <p className="text-xs text-muted-foreground">Kode: {error.digest}</p>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>Coba lagi</Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Ke Dashboard</Link>
        </Button>
      </div>
    </main>
  );
}

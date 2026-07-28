"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

type SyncResult = {
  status: string;
  checked_count: number;
  created_count: number;
  updated_count: number;
  deactivated_count: number;
  failed_count: number;
  errors?: string[];
};

export function HrisSyncButton({ disabled }: { disabled?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/internal/hris/sync", { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Sinkronisasi gagal");
        return;
      }
      setResult(json.data as SyncResult);
    } catch {
      setError("Tidak dapat menghubungi server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        onClick={handleSync}
        disabled={disabled || loading}
        className="w-full sm:w-auto"
      >
        <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Menyinkronkan…" : "Sinkronkan Sekarang"}
      </Button>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {result ? (
        <Alert>
          <AlertDescription>
            Status: <strong>{result.status}</strong> · Diperiksa:{" "}
            {result.checked_count} · Baru: {result.created_count} · Diperbarui:{" "}
            {result.updated_count} · Dinonaktifkan: {result.deactivated_count} ·
            Gagal: {result.failed_count}
            {result.errors?.length ? (
              <span className="mt-2 block text-xs text-muted-foreground">
                {result.errors.slice(0, 3).join(" · ")}
              </span>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

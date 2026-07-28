"use client";

import { useState } from "react";
import { Eye, RefreshCw } from "lucide-react";
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

type PreviewResult = {
  dry_run: true;
  checked_count: number;
  would_create: unknown[];
  would_update: unknown[];
  would_deactivate: unknown[];
  failed: unknown[];
  ambiguous: unknown[];
  unchanged_count: number;
  incremental_since: string | null;
};

export function HrisSyncButton({
  disabled,
  outletConfirmed,
}: {
  disabled?: boolean;
  outletConfirmed?: boolean;
}) {
  const [loading, setLoading] = useState<"preview" | "sync" | "full" | null>(
    null,
  );
  const [result, setResult] = useState<SyncResult | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function callSync(body: Record<string, unknown>) {
    setError(null);
    setResult(null);
    setPreview(null);

    const res = await fetch("/api/internal/hris/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!json.success) {
      setError(json.error ?? "Permintaan gagal");
      return null;
    }
    return json.data;
  }

  async function handlePreview(full = false) {
    setLoading(full ? "full" : "preview");
    try {
      const data = await callSync({ dry_run: true, full });
      if (data) setPreview(data as PreviewResult);
    } catch {
      setError("Tidak dapat menghubungi server");
    } finally {
      setLoading(null);
    }
  }

  async function handleSync(full = false) {
    if (!outletConfirmed) {
      setError(
        "Mapping outlet belum dikonfirmasi. Set HRIS_OUTLET_MAPPING_CONFIRMED=true setelah review.",
      );
      return;
    }
    setLoading(full ? "full" : "sync");
    try {
      const data = await callSync({ full });
      if (data) setResult(data as SyncResult);
    } catch {
      setError("Tidak dapat menghubungi server");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => handlePreview(false)}
        disabled={disabled || loading !== null}
      >
        <Eye className="mr-2 size-4" />
        {loading === "preview" ? "Memuat preview…" : "Preview (incremental)"}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => handlePreview(true)}
        disabled={disabled || loading !== null}
      >
        <Eye className="mr-2 size-4" />
        {loading === "full" ? "Memuat…" : "Preview (full)"}
      </Button>
      <Button
        type="button"
        onClick={() => handleSync(false)}
        disabled={disabled || loading !== null || !outletConfirmed}
      >
        <RefreshCw
          className={`mr-2 size-4 ${loading === "sync" ? "animate-spin" : ""}`}
        />
        {loading === "sync" ? "Menyinkronkan…" : "Sync Incremental"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() => handleSync(true)}
        disabled={disabled || loading !== null || !outletConfirmed}
      >
        Sync Full
      </Button>

      {error ? (
        <Alert variant="destructive" className="w-full">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {preview ? (
        <Alert className="w-full">
          <AlertDescription>
            <strong>Preview (dry-run)</strong> — tidak ada data ditulis.
            <br />
            Incremental since:{" "}
            {preview.incremental_since ?? "full (belum ada sync sukses)"}
            <br />
            Buat: {preview.would_create.length} · Update:{" "}
            {preview.would_update.length} · Nonaktif:{" "}
            {preview.would_deactivate.length} · Gagal: {preview.failed.length} ·
            Ambigu: {preview.ambiguous.length}
          </AlertDescription>
        </Alert>
      ) : null}

      {result ? (
        <Alert className="w-full">
          <AlertDescription>
            Status: <strong>{result.status}</strong> · Diperiksa:{" "}
            {result.checked_count} · Baru: {result.created_count} · Diperbarui:{" "}
            {result.updated_count} · Dinonaktifkan: {result.deactivated_count}{" "}
            · Gagal: {result.failed_count}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

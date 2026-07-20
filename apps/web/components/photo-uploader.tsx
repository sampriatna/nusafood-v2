"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, CheckCircle2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { compressImageFile } from "@/lib/image-utils";

interface PhotoUploaderProps {
  label?: string;
  required?: boolean;
  /** Public URL setelah upload sukses (atau preview data URL sementara) */
  value?: string;
  onChange: (url: string | undefined) => void;
  className?: string;
  size?: "default" | "large";
  /** Jika diisi, foto di-upload ke /api/uploads/photo setelah compress */
  upload?: {
    taskId: string;
    token?: string;
    context?:
      | "before"
      | "after"
      | "checklist_item"
      | "daily_report"
      | "disciplinary";
  };
}

export function PhotoUploader({
  label = "Upload Foto",
  required = false,
  value,
  onChange,
  className,
  size = "default",
  upload,
}: PhotoUploaderProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(value);

  const handleFileChange = useCallback(
    async (file: File | undefined) => {
      if (!file) {
        setPreview(undefined);
        onChange(undefined);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert("Ukuran foto maksimal 10MB");
        return;
      }

      if (!file.type.startsWith("image/")) {
        alert("Hanya file gambar yang diperbolehkan");
        return;
      }

      setIsProcessing(true);

      try {
        const dataUrl = await compressImageFile(file);
        setPreview(dataUrl);

        if (!upload) {
          onChange(dataUrl);
          return;
        }

        const blob = await (await fetch(dataUrl)).blob();
        const form = new FormData();
        form.append("file", blob, "photo.jpg");
        form.append("task_id", upload.taskId);
        if (upload.token) form.append("token", upload.token);
        form.append("context", upload.context ?? "after");

        const res = await fetch("/api/uploads/photo", {
          method: "POST",
          body: form,
          credentials: "include",
        });
        const json = (await res.json()) as {
          success: boolean;
          data?: { url: string };
          error?: string;
        };

        if (!json.success || !json.data?.url) {
          setPreview(undefined);
          onChange(undefined);
          alert(json.error || "Gagal upload foto");
          return;
        }

        setPreview(json.data.url);
        onChange(json.data.url);
      } catch {
        setPreview(undefined);
        onChange(undefined);
        alert("Gagal memproses foto. Coba lagi.");
      } finally {
        setIsProcessing(false);
      }
    },
    [onChange, upload],
  );

  const clearInputs = () => {
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const clearPhoto = () => {
    setPreview(undefined);
    onChange(undefined);
    clearInputs();
  };

  const isLarge = size === "large";
  const shown = preview || value;

  const pickerButtons = (replaceMode: boolean) => (
    <div className="grid grid-cols-2 gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={() => cameraInputRef.current?.click()}
        className={cn(
          "flex h-auto flex-col gap-2 py-4 font-semibold",
          isLarge ? "text-base" : "text-sm",
        )}
      >
        <Camera className={cn(isLarge ? "h-7 w-7" : "h-5 w-5")} />
        {replaceMode ? "Ambil Ulang" : "Ambil Foto"}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => galleryInputRef.current?.click()}
        className={cn(
          "flex h-auto flex-col gap-2 py-4 font-semibold",
          isLarge ? "text-base" : "text-sm",
        )}
      >
        <ImageIcon className={cn(isLarge ? "h-7 w-7" : "h-5 w-5")} />
        {replaceMode ? "Ganti Galeri" : "Pilih Galeri"}
      </Button>
    </div>
  );

  return (
    <div className={cn("space-y-3", className)}>
      {label ? (
        <label
          className={cn(
            "block font-semibold text-foreground",
            isLarge ? "text-lg" : "text-sm",
          )}
        >
          {label}
          {required ? <span className="ml-1 text-destructive">*</span> : null}
        </label>
      ) : null}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          void handleFileChange(e.target.files?.[0]);
          clearInputs();
        }}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          void handleFileChange(e.target.files?.[0]);
          clearInputs();
        }}
        className="hidden"
      />

      {isProcessing ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5",
            isLarge ? "min-h-[250px]" : "min-h-[180px]",
          )}
        >
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 font-medium text-primary">
            {upload ? "Mengupload foto..." : "Memproses foto..."}
          </p>
        </div>
      ) : shown ? (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-xl border-2 border-success bg-success/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shown}
              alt="Preview foto"
              className={cn(
                "w-full object-cover",
                isLarge ? "max-h-[300px]" : "max-h-[200px]",
              )}
            />
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-success px-3 py-1.5 text-sm font-medium text-success-foreground">
              <CheckCircle2 className="h-4 w-4" />
              Foto siap
            </div>
          </div>
          {pickerButtons(true)}
          <Button
            type="button"
            variant="ghost"
            onClick={clearPhoto}
            className={cn(
              "w-full text-muted-foreground",
              isLarge ? "h-12 text-base" : "h-10 text-sm",
            )}
          >
            Hapus Foto
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            "rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 p-4",
            isLarge ? "p-6" : "p-4",
          )}
        >
          {pickerButtons(false)}
          <p
            className={cn(
              "mt-3 text-center text-muted-foreground",
              isLarge ? "text-sm" : "text-xs",
            )}
          >
            Ambil foto baru atau pilih dari galeri HP
          </p>
        </div>
      )}
    </div>
  );
}

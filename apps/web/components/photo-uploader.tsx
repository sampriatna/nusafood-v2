"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, CheckCircle2, RefreshCcw } from "lucide-react";
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
    token: string;
    context?: "before" | "after" | "checklist_item";
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
  const inputRef = useRef<HTMLInputElement>(null);
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
        form.append("token", upload.token);
        form.append("context", upload.context ?? "after");

        const res = await fetch("/api/uploads/photo", {
          method: "POST",
          body: form,
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

  const clearPhoto = () => {
    setPreview(undefined);
    onChange(undefined);
    if (inputRef.current) inputRef.current.value = "";
  };

  const isLarge = size === "large";
  const shown = preview || value;

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
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileChange(e.target.files?.[0])}
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
          <Button
            type="button"
            variant="outline"
            onClick={clearPhoto}
            className={cn("w-full font-semibold", isLarge ? "h-14 text-base" : "h-12")}
          >
            <RefreshCcw className="mr-2 h-5 w-5" />
            Ganti Foto
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 transition-all hover:border-primary hover:bg-primary/10 active:scale-[0.98]",
            isLarge ? "min-h-[220px] p-8" : "min-h-[160px] p-6",
          )}
        >
          <div
            className={cn(
              "flex items-center justify-center rounded-full bg-primary/20",
              isLarge ? "h-20 w-20" : "h-14 w-14",
            )}
          >
            <Camera className={cn("text-primary", isLarge ? "h-10 w-10" : "h-7 w-7")} />
          </div>
          <div className="text-center">
            <p
              className={cn(
                "font-bold text-foreground",
                isLarge ? "text-xl" : "text-base",
              )}
            >
              KETUK UNTUK AMBIL FOTO
            </p>
            <p
              className={cn(
                "mt-1 text-muted-foreground",
                isLarge ? "text-base" : "text-sm",
              )}
            >
              Arahkan kamera ke objek
            </p>
          </div>
        </button>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { compressImageFile } from "@/lib/image-utils";
import type { ChecklistReport } from "@nusafood/types";

type PageState = "loading" | "ready" | "submitting" | "success" | "error";

type Props = { taskId: string; token: string };

async function uploadPhoto(
  file: File,
  taskId: string,
  token: string,
): Promise<string> {
  const dataUrl = await compressImageFile(file);
  const blob = await (await fetch(dataUrl)).blob();
  const form = new FormData();
  form.append("file", blob, "photo.jpg");
  form.append("task_id", taskId);
  form.append("token", token);
  form.append("context", "checklist_item");
  const res = await fetch("/api/uploads/photo", { method: "POST", body: form });
  const json = (await res.json()) as {
    success: boolean;
    data?: { url: string };
    error?: string;
  };
  if (!json.success || !json.data?.url) {
    throw new Error(json.error || "Gagal upload foto");
  }
  return json.data.url;
}

export function StaffChecklistClient({ taskId, token }: Props) {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [checklist, setChecklist] = useState<ChecklistReport | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [itemPhotos, setItemPhotos] = useState<Record<string, string>>({});
  const [staffNote, setStaffNote] = useState("");

  const loadChecklist = useCallback(async () => {
    setPageState("loading");
    setErrorMessage("");
    try {
      const res = await fetch(
        `/api/checklist-reports/${encodeURIComponent(taskId)}/public?token=${encodeURIComponent(token)}`,
      );
      const json = (await res.json()) as {
        success: boolean;
        data?: ChecklistReport;
        error?: string;
      };
      if (!json.success || !json.data) {
        setErrorMessage(json.error || "Link checklist tidak valid");
        setPageState("error");
        return;
      }

      const active = (json.data.items || []).filter((i) => i.active_status);
      if (active.length === 0) {
        setErrorMessage("Checklist ditemukan tetapi tidak punya item");
        setPageState("error");
        return;
      }

      setChecklist(json.data);

      if (["SUBMITTED", "DONE"].includes(json.data.status)) {
        setPageState("success");
        return;
      }

      const initial: Record<string, boolean> = {};
      const photos: Record<string, string> = {};
      for (const item of json.data.items) {
        const existing = json.data.checked_items.find(
          (c) => c.checklist_item_id === item.checklist_item_id,
        );
        initial[item.checklist_item_id] = Boolean(existing?.is_checked);
        if (existing?.photo_url) {
          photos[item.checklist_item_id] = existing.photo_url;
        }
      }
      setCheckedItems(initial);
      setItemPhotos(photos);
      setPageState("ready");
    } catch {
      setErrorMessage("Terjadi kesalahan. Coba lagi nanti.");
      setPageState("error");
    }
  }, [taskId, token]);

  useEffect(() => {
    if (!token) {
      setErrorMessage("Link checklist tidak valid");
      setPageState("error");
      return;
    }
    void loadChecklist();
  }, [token, loadChecklist]);

  function canSubmit() {
    if (!checklist) return false;
    const required = checklist.items.filter(
      (i) => i.is_required && i.active_status,
    );
    if (!required.every((i) => checkedItems[i.checklist_item_id])) return false;
    const photoRequired = checklist.items.filter(
      (i) =>
        i.requires_photo &&
        i.active_status &&
        checkedItems[i.checklist_item_id],
    );
    return photoRequired.every((i) => itemPhotos[i.checklist_item_id]);
  }

  function buttonLabel() {
    if (!checklist) return "KIRIM LAPORAN";
    const required = checklist.items.filter(
      (i) => i.is_required && i.active_status,
    );
    const checked = required.filter((i) => checkedItems[i.checklist_item_id]);
    if (checked.length < required.length) {
      return `CENTANG DULU (${checked.length}/${required.length})`;
    }
    const photoRequired = checklist.items.filter(
      (i) =>
        i.requires_photo &&
        i.active_status &&
        checkedItems[i.checklist_item_id],
    );
    const uploaded = photoRequired.filter((i) => itemPhotos[i.checklist_item_id]);
    if (uploaded.length < photoRequired.length) {
      return `UPLOAD FOTO DULU (${uploaded.length}/${photoRequired.length})`;
    }
    return "KIRIM LAPORAN";
  }

  async function handleItemPhoto(
    itemId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadPhoto(file, taskId, token);
      setItemPhotos((prev) => ({ ...prev, [itemId]: url }));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal upload foto");
    }
  }

  async function handleSubmit() {
    if (!checklist || !canSubmit()) return;
    setPageState("submitting");
    try {
      const checked_items = checklist.items
        .filter((i) => i.active_status)
        .map((i) => ({
          checklist_item_id: i.checklist_item_id,
          is_checked: Boolean(checkedItems[i.checklist_item_id]),
          photo_url: itemPhotos[i.checklist_item_id],
        }));

      const res = await fetch(
        `/api/checklist-reports/${encodeURIComponent(taskId)}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            checked_items,
            staff_note: staffNote || undefined,
          }),
        },
      );
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error || "Gagal mengirim");
      setPageState("success");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal mengirim laporan",
      );
      setPageState("error");
    }
  }

  if (pageState === "loading" || pageState === "submitting") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">
            {pageState === "submitting"
              ? "Mengirim checklist..."
              : "Memuat checklist..."}
          </p>
        </div>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
        <h1 className="text-xl font-bold">Checklist tidak tersedia</h1>
        <p className="mt-2 text-center text-muted-foreground">{errorMessage}</p>
        <Button className="mt-6" variant="outline" onClick={() => void loadChecklist()}>
          Coba lagi
        </Button>
      </div>
    );
  }

  if (pageState === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-success/5 p-6">
        <CheckCircle2 className="mb-4 h-16 w-16 text-success" />
        <h1 className="text-2xl font-bold">Checklist Terkirim!</h1>
        <p className="mt-2 text-muted-foreground">
          Laporan checklist berhasil dikirim.
        </p>
      </div>
    );
  }

  if (!checklist) return null;

  const deadline = new Date(checklist.deadline);
  const isLate = Date.now() > deadline.getTime();
  const activeItems = checklist.items.filter((i) => i.active_status);

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="bg-primary p-4 text-center text-primary-foreground">
        <h1 className="text-lg font-bold">CHECKLIST</h1>
      </header>

      <div
        className={`flex items-center justify-center gap-2 p-3 ${
          isLate
            ? "bg-destructive/10 text-destructive"
            : "bg-warning/10 text-warning-foreground"
        }`}
      >
        <Clock className="h-5 w-5" />
        <span className="font-semibold">
          {isLate
            ? "TERLAMBAT!"
            : `Deadline ${deadline.toLocaleString("id-ID")}`}
        </span>
      </div>

      <div className="mx-auto max-w-lg space-y-4 p-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="font-mono text-xs text-muted-foreground">
            {checklist.task_id}
          </p>
          <h2 className="text-xl font-bold">{checklist.checklist_title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {checklist.outlet} · {checklist.area} · {checklist.pic_name}
          </p>
        </div>

        <ul className="space-y-3">
          {activeItems.map((item) => {
            const checked = Boolean(checkedItems[item.checklist_item_id]);
            return (
              <li
                key={item.checklist_item_id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <button
                  type="button"
                  className="flex w-full items-start gap-3 text-left"
                  onClick={() =>
                    setCheckedItems((prev) => ({
                      ...prev,
                      [item.checklist_item_id]: !prev[item.checklist_item_id],
                    }))
                  }
                >
                  {checked ? (
                    <Check className="mt-0.5 h-6 w-6 text-success" />
                  ) : (
                    <Square className="mt-0.5 h-6 w-6 text-muted-foreground" />
                  )}
                  <span className="flex-1 text-base font-medium">
                    {item.item_text}
                    {item.is_required ? (
                      <span className="ml-1 text-destructive">*</span>
                    ) : null}
                  </span>
                </button>

                {item.requires_photo && checked ? (
                  <div className="mt-3 space-y-2 pl-9">
                    {itemPhotos[item.checklist_item_id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={itemPhotos[item.checklist_item_id]}
                        alt="Foto item"
                        className="max-h-40 w-full rounded-md object-cover"
                      />
                    ) : null}
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary">
                      <Camera className="h-4 w-4" />
                      {itemPhotos[item.checklist_item_id]
                        ? "Ganti foto"
                        : "Upload foto item"}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) =>
                          void handleItemPhoto(item.checklist_item_id, e)
                        }
                      />
                    </label>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        <div className="rounded-xl border border-border bg-card p-4">
          <label className="mb-2 block text-sm text-muted-foreground">
            Catatan (opsional)
          </label>
          <Textarea
            value={staffNote}
            onChange={(e) => setStaffNote(e.target.value)}
            rows={2}
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4">
        <div className="mx-auto max-w-lg">
          <Button
            className="h-14 w-full text-lg font-bold"
            disabled={!canSubmit()}
            onClick={() => void handleSubmit()}
          >
            {buttonLabel()}
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  templateId: string;
  picName: string;
  picWa: string;
};

export function GenerateChecklistButton({ templateId, picName, picWa }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
      <p className="text-sm">
        Kirim checklist ke <span className="font-medium">{picName}</span> (
        {picWa})
      </p>
      <Button
        disabled={pending || !picName || !picWa}
        onClick={() => {
          setError(null);
          setLink(null);
          startTransition(async () => {
            const res = await fetch("/api/checklist-reports/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                template_id: templateId,
                pic_name: picName,
                pic_wa: picWa,
              }),
            });
            const json = (await res.json()) as {
              success: boolean;
              data?: {
                task?: { task_id: string; report_link?: string; token?: string };
              };
              error?: string;
            };
            if (!json.success || !json.data?.task?.task_id) {
              setError(json.error || "Gagal generate");
              return;
            }
            const href =
              json.data.task.report_link ||
              `/checklist/${json.data.task.task_id}?token=${json.data.task.token ?? ""}`;
            setLink(href);
          });
        }}
      >
        {pending ? "Generating…" : "Kirim Checklist ke Staff"}
      </Button>
      {link ? (
        <p className="break-all text-sm">
          Link staff:{" "}
          <a
            href={link}
            className="text-primary underline"
            target="_blank"
            rel="noreferrer"
          >
            {link}
          </a>
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

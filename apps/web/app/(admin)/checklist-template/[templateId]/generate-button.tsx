"use client";

import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Props = {
  templateId: string;
  picName: string;
  picWa: string;
};

export function GenerateChecklistButton({ templateId, picName, picWa }: Props) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [link, setLink] = useState<string | null>(null);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="font-medium">Kirim Checklist ke Staff</p>
          <p className="text-sm text-muted-foreground">
            {picName || "PIC belum di-set"} · {picWa || "—"}
          </p>
        </div>
        <Button
          className="w-full sm:w-auto"
          disabled={pending || !picName || !picWa}
          onClick={() => {
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
                  task?: {
                    task_id: string;
                    report_link?: string;
                    token?: string;
                    wa_sent?: boolean;
                    wa_error?: string;
                  };
                };
                error?: string;
              };
              if (!json.success || !json.data?.task?.task_id) {
                toast({
                  title: "Gagal generate",
                  description: json.error || "Coba lagi",
                  variant: "destructive",
                });
                return;
              }
              const href =
                json.data.task.report_link ||
                `/checklist/${json.data.task.task_id}?token=${json.data.task.token ?? ""}`;
              setLink(href);
              if (json.data.task.wa_sent) {
                toast({
                  title: "Checklist dikirim",
                  description: `WA terkirim ke ${picName}`,
                });
              } else {
                toast({
                  title: "Checklist dibuat",
                  description:
                    json.data.task.wa_error === "GAS_NOT_CONFIGURED"
                      ? "Link siap — WA via GAS belum dikonfigurasi"
                      : `Link siap — ${json.data.task.wa_error || "WA gagal, share link manual"}`,
                });
              }
            });
          }}
        >
          {pending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Send className="mr-2 size-4" />
          )}
          Kirim Checklist
        </Button>
        {link ? (
          <p className="break-all rounded-md bg-background p-2 text-sm">
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
      </CardContent>
    </Card>
  );
}

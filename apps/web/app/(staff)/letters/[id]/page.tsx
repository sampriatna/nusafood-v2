"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import type { DisciplinaryLetter } from "@nusafood/types";
import { AdminPage } from "@/components/admin-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type ApiResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

export default function StaffLetterDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast } = useToast();
  const [letter, setLetter] = useState<DisciplinaryLetter | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/disciplinary/mine", {
        credentials: "include",
      });
      const json = (await res.json()) as ApiResponse<DisciplinaryLetter[]>;
      if (!json.success || !json.data) {
        toast({
          title: "Gagal memuat",
          description: json.error || "Tidak ditemukan",
          variant: "destructive",
        });
        return;
      }
      const found = json.data.find((item) => item.id === id) || null;
      setLetter(found);
      if (!found) {
        toast({
          title: "Surat tidak ditemukan",
          description: "Surat ini bukan milik kamu atau tidak ada.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  function acknowledge() {
    startTransition(async () => {
      const res = await fetch(`/api/disciplinary/${id}/acknowledge`, {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as ApiResponse<DisciplinaryLetter>;
      if (!json.success || !json.data) {
        toast({
          title: "Gagal acknowledge",
          description: json.error || "Coba lagi",
          variant: "destructive",
        });
        return;
      }
      setLetter(json.data);
      toast({ title: "Surat ditandai sudah dibaca" });
    });
  }

  if (loading) {
    return (
      <AdminPage title="Detail Surat" backHref="/letters">
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Memuat...
          </CardContent>
        </Card>
      </AdminPage>
    );
  }

  if (!letter) {
    return (
      <AdminPage title="Detail Surat" backHref="/letters">
        <Card>
          <CardContent className="p-6">Surat tidak ditemukan.</CardContent>
        </Card>
      </AdminPage>
    );
  }

  return (
    <AdminPage title="Detail Surat" backHref="/letters" maxWidth="2xl">
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-mono text-xs text-muted-foreground">
                {letter.letter_number}
              </p>
              <h2 className="text-lg font-semibold">{letter.title}</h2>
            </div>
            <Badge variant="secondary">{letter.status}</Badge>
          </div>
          <p className="text-sm">
            {letter.type === "PERINGATAN" ? "SP" : "ST"} {letter.level} ·{" "}
            {letter.outlet_name_snapshot}
          </p>
          <p className="text-sm text-muted-foreground">
            Kejadian: {letter.incident_date}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4 text-sm">
          <div>
            <p className="font-medium">Kronologi</p>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {letter.chronology}
            </p>
          </div>
          <div>
            <p className="font-medium">Detail kesalahan</p>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {letter.violation_detail}
            </p>
          </div>
          <div>
            <p className="font-medium">Instruksi perbaikan</p>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {letter.correction_instruction}
            </p>
          </div>
          {letter.pdf_url ? (
            <a
              href={letter.pdf_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary underline"
            >
              Buka PDF/arsip
            </a>
          ) : null}
        </CardContent>
      </Card>

      {letter.status === "SENT" ? (
        <Button disabled={pending} onClick={acknowledge} className="w-full">
          Saya sudah membaca surat ini
        </Button>
      ) : letter.status === "ACKNOWLEDGED" ? (
        <p className="text-sm text-muted-foreground">
          Sudah diakui
          {letter.acknowledged_at
            ? ` · ${new Date(letter.acknowledged_at).toLocaleString("id-ID")}`
            : ""}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Surat belum dalam status terkirim — belum bisa diakui.
        </p>
      )}
    </AdminPage>
  );
}

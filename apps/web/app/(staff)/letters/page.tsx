"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { DisciplinaryLetter } from "@nusafood/types";
import { AdminPage } from "@/components/admin-page";
import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type ApiResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string };

export default function StaffLettersPage() {
  const { toast } = useToast();
  const [letters, setLetters] = useState<DisciplinaryLetter[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/disciplinary/mine", {
        credentials: "include",
      });
      const json = (await res.json()) as ApiResponse<DisciplinaryLetter[]>;
      if (!json.success || !json.data) {
        toast({
          title: "Gagal memuat surat",
          description: json.error || "Coba lagi",
          variant: "destructive",
        });
        return;
      }
      setLetters(json.data);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminPage title="Surat Saya" maxWidth="2xl" showBack={false}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Surat Teguran (ST) dan Surat Peringatan (SP) untuk kamu. Baca dan akui
          jika status sudah dikirim.
        </p>
        <LogoutButton />
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Memuat...
          </CardContent>
        </Card>
      ) : letters.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Belum ada surat untuk kamu.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {letters.map((letter) => (
            <Card key={letter.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">
                      {letter.letter_number}
                    </p>
                    <h2 className="font-semibold">{letter.title}</h2>
                  </div>
                  <Badge variant="secondary">{letter.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {letter.type === "PERINGATAN" ? "SP" : "ST"} {letter.level} ·{" "}
                  {letter.outlet_name_snapshot} · {letter.incident_date}
                </p>
                <Link href={`/letters/${letter.id}`}>
                  <Button variant="outline" size="sm">
                    Buka detail
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminPage>
  );
}

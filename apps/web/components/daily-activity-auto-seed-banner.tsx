import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  templateCount: number;
};

export function DailyActivityAutoSeedBanner({ templateCount }: Props) {
  return (
    <Card className="border-emerald-200 bg-emerald-50">
      <CardContent className="flex gap-3 p-4 text-sm text-emerald-900">
        <Sparkles className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-semibold">Template kegiatan otomatis di-import</p>
          <p>
            Database masih kosong tadi — sistem sudah mengisi{" "}
            <strong>{templateCount} template</strong> (Kasir, Purchasing, Gudang,
            Produksi FnB/NF, Advertising, Admin MP, CS NF, Finance, Design, +
            Waiters/Bar/Dapur/PA).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

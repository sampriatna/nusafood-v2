import {
  listAreas,
  listOutlets,
} from "@/lib/services/master-data.service";
import { listStaff } from "@/lib/services/staff.service";
import { MobileHeader } from "@/components/mobile-header";
import { CreateTaskForm } from "./create-task-form";

export const dynamic = "force-dynamic";

/**
 * Kategori tugas operasional yang sengaja dikurasi.
 * Jangan gunakan seluruh master category hasil sync v1 di form ini karena
 * data legacy berisi kata kerja/duplikat kapital seperti BERSIHKAN/Bersihkan.
 */
const TASK_CATEGORIES = [
  { value: "General", label: "Operasional / Umum" },
  { value: "Cleaning", label: "Kebersihan" },
  { value: "Stock", label: "Stok & Persediaan" },
  { value: "Production", label: "Produksi" },
  { value: "Maintenance", label: "Maintenance / Perbaikan" },
  { value: "Floor", label: "Pelayanan / Floor" },
  { value: "Marketing", label: "Marketing / Konten" },
  { value: "Administration", label: "Administrasi" },
  { value: "Finance", label: "Keuangan" },
  { value: "Delivery", label: "Pengiriman / Antar" },
  { value: "Special", label: "Tugas Khusus" },
] as const;

export default async function NewTaskPage() {
  const [outlets, areas, staff] = await Promise.all([
    listOutlets(),
    listAreas(),
    listStaff({ status: "ACTIVE" }),
  ]);

  return (
    <div className="min-h-screen bg-background pb-8">
      <MobileHeader title="Buat Tugas Baru" showBack backHref="/dashboard" />
      <main className="mx-auto max-w-xl space-y-4 px-4 py-4 sm:px-6">
        <p className="text-sm text-muted-foreground">
          Pilih bagian kerja, jenis tugas, prioritas, lalu PIC yang bertanggung jawab.
        </p>
        <CreateTaskForm
          outlets={outlets.map((o) => ({
            value: o.code,
            label: `${o.code} — ${o.name}`,
          }))}
          areas={areas.map((a) => ({
            value: a.name,
            label: a.name,
            outlet: a.outlet,
          }))}
          categories={TASK_CATEGORIES.map((c) => ({ ...c }))}
          staff={staff}
        />
      </main>
    </div>
  );
}

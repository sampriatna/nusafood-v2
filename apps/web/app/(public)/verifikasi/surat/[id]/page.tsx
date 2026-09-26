import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { formatTanggal, outletLabel, romanLevel } from "@/lib/letter/letter-format";
import { NF3_COMPANY } from "@/lib/nf3-company";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verifikasi Dokumen NF3", robots: { index: false } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS: Record<string, { label: string; ok: boolean }> = {
  DRAFT: { label: "Draft — belum diterbitkan", ok: false },
  WAITING_APPROVAL: { label: "Menunggu persetujuan", ok: false },
  APPROVED: { label: "Diterbitkan", ok: true },
  SENT: { label: "Diterbitkan", ok: true },
  ACKNOWLEDGED: { label: "Diterbitkan & diterima karyawan", ok: true },
  RESOLVED: { label: "Diterbitkan — perbaikan selesai", ok: true },
  CANCELLED: { label: "Dibatalkan", ok: false },
};

/** Halaman publik dari QR surat: hanya data identitas dokumen, tanpa isi pelanggaran. */
export default async function VerifyLetterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const letter = UUID_RE.test(id)
    ? await prisma.disciplinaryLetter.findUnique({
        where: { id },
        select: {
          letterNumber: true,
          type: true,
          level: true,
          status: true,
          employeeNameSnapshot: true,
          outletNameSnapshot: true,
          incidentDate: true,
        },
      })
    : null;

  const status = letter ? STATUS[letter.status] ?? { label: letter.status, ok: false } : null;

  return (
    <main className="mx-auto min-h-screen max-w-md bg-background px-4 py-10 text-foreground">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Verifikasi dokumen
      </p>
      <h1 className="mt-1 text-xl font-bold">
        {NF3_COMPANY.legalName} ({NF3_COMPANY.brand})
      </h1>

      {!letter || !status ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Dokumen tidak ditemukan di sistem NF3. Surat ini tidak dapat diverifikasi.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div
            className={`rounded-xl border p-4 text-sm font-semibold ${
              status.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            {status.ok ? "✓ Dokumen terdaftar di sistem NF3" : "Dokumen terdaftar, namun"}{" "}
            — {status.label}
          </div>
          <dl className="grid grid-cols-[8rem_1fr] gap-y-2 rounded-xl border p-4 text-sm">
            <dt className="text-muted-foreground">Jenis</dt>
            <dd className="font-medium">
              {letter.type === "PERINGATAN" ? "Surat Peringatan" : "Surat Teguran"}{" "}
              {romanLevel(letter.level)}
            </dd>
            <dt className="text-muted-foreground">Nomor</dt>
            <dd className="font-medium">{letter.letterNumber}</dd>
            <dt className="text-muted-foreground">Tanggal</dt>
            <dd className="font-medium">{formatTanggal(letter.incidentDate.toISOString().slice(0, 10))}</dd>
            <dt className="text-muted-foreground">Karyawan</dt>
            <dd className="font-medium">{letter.employeeNameSnapshot}</dd>
            <dt className="text-muted-foreground">Outlet</dt>
            <dd className="font-medium">{outletLabel(letter.outletNameSnapshot)}</dd>
          </dl>
          <p className="text-xs text-muted-foreground">
            Halaman ini hanya memastikan dokumen tercatat di sistem NF3. Isi lengkap
            surat hanya dapat dilihat oleh manajemen.
          </p>
        </div>
      )}
    </main>
  );
}

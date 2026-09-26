import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";

/** Model bisa diganti lewat env tanpa ubah kode (mis. claude-haiku-4-5 untuk hemat biaya). */
const DEFAULT_MODEL = "claude-opus-5";

export const TaskDraftSchema = z.object({
  task_title: z.string(),
  task_description: z.string(),
});

export type TaskDraft = z.infer<typeof TaskDraftSchema>;

export type TaskDraftInput = {
  note: string;
  outlet?: string;
  area?: string;
  category?: string;
  category_label?: string;
  priority?: string;
  current_title?: string;
  current_description?: string;
};

/** Fokus isi deskripsi per Jenis Tugas (value dari form Buat Tugas). */
const CATEGORY_FOCUS: Record<string, string> = {
  General:
    "tugas operasional harian: jelaskan apa yang dikerjakan, urutan kerja, dan kondisi akhir yang diharapkan.",
  Cleaning:
    "kebersihan: area/alat yang dibersihkan, bahan pembersih, urutan pembersihan, standar bersih yang bisa dicek dari foto.",
  Stock:
    "stok & persediaan: item yang dicek/dihitung, cara hitung (FIFO, cek expired), pencatatan, dan batas minimum yang harus dilaporkan.",
  Production:
    "produksi: menu/bahan, jumlah/porsi target, SOP resep & higienitas, penyimpanan hasil (label tanggal, suhu).",
  Maintenance:
    "maintenance/perbaikan: alat yang bermasalah, gejala, langkah cek/perbaikan yang aman (matikan listrik/gas dulu), kapan harus panggil teknisi.",
  Floor:
    "pelayanan/floor: area layanan, standar sikap & kecepatan layanan, kerapian meja/area tamu, hal yang dilaporkan ke leader.",
  Marketing:
    "marketing/konten: jenis konten, pesan utama, jumlah/format (foto, video, story), tempat posting, dan tenggat.",
  Administration:
    "administrasi: dokumen/data yang disiapkan, sumber datanya, format, dan ke siapa diserahkan.",
  Finance:
    "keuangan: transaksi/laporan yang dicek, cara rekonsiliasi (kas, nota, setoran), bukti yang dilampirkan.",
  Delivery:
    "pengiriman/antar: barang, tujuan, cara packing/cek kondisi barang, bukti serah terima.",
  Special:
    "tugas khusus: jelaskan latar belakang singkat, langkah kerja, dan hasil akhir yang diharapkan secara jelas.",
};

const SYSTEM_PROMPT = `Anda membantu admin/leader restoran NF3 menulis tugas untuk staff outlet.
Staff membaca tugas di HP lewat WhatsApp, jadi tulis dalam Bahasa Indonesia yang sederhana, jelas, dan langsung bisa dikerjakan.

Hasilkan:
- task_title: judul singkat berupa kalimat perintah, maksimal 60 karakter, tanpa emoji. Contoh: "Deep cleaning hood & filter exhaust dapur".
- task_description: teks polos (tanpa markdown #, **, atau tabel) dengan format persis:

Tujuan:
<1-2 kalimat kenapa tugas ini penting>

Langkah:
1. ...
2. ...
(3-7 langkah konkret, urut, bisa dicek)

Standar selesai:
- ...
(1-3 poin yang bisa dibuktikan, sebutkan foto after yang harus dikirim)

Aturan:
- Sesuaikan isi dengan Jenis Tugas yang diberikan.
- Jangan mengarang angka/nama spesifik yang tidak ada di catatan kecuali standar umum yang wajar untuk dapur/restoran.
- Utamakan keselamatan kerja jika tugas menyangkut listrik, gas, api, atau bahan kimia.
- Jika catatan admin kurang jelas, buat tugas yang paling masuk akal dari konteks yang ada.`;

export function buildTaskDraftPrompt(input: TaskDraftInput): string {
  const focus =
    (input.category && CATEGORY_FOCUS[input.category]) ?? CATEGORY_FOCUS.General;
  const lines = [
    `Catatan admin: ${input.note.trim()}`,
    input.outlet ? `Outlet: ${input.outlet}` : "",
    input.area ? `Bagian/Area: ${input.area}` : "",
    `Jenis Tugas: ${input.category_label || input.category || "Operasional / Umum"}`,
    `Fokus deskripsi untuk jenis ini: ${focus}`,
    input.priority ? `Prioritas: ${input.priority}` : "",
    input.current_title?.trim()
      ? `Judul yang sudah ditulis admin (boleh diperbaiki): ${input.current_title.trim()}`
      : "",
    input.current_description?.trim()
      ? `Deskripsi yang sudah ditulis admin (pertahankan maksudnya, rapikan formatnya):\n${input.current_description.trim()}`
      : "",
  ];
  return lines.filter(Boolean).join("\n");
}

/** Bersihkan salah tempel umum di dashboard env: spasi/enter dan tanda kutip. */
export function readApiKey(raw = process.env.ANTHROPIC_API_KEY): string {
  return (raw ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
}

export function isAiConfigured(): boolean {
  return Boolean(readApiKey());
}

export class TaskDraftError extends Error {
  constructor(
    message: string,
    public code: string,
    public status = 502,
  ) {
    super(message);
  }
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  client ??= new Anthropic({
    apiKey: readApiKey(),
    timeout: 45_000,
    maxRetries: 1,
  });
  return client;
}

export async function generateTaskDraft(input: TaskDraftInput): Promise<TaskDraft> {
  const model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;

  if (!readApiKey().startsWith("sk-ant-")) {
    throw new TaskDraftError(
      "Format API key AI salah (harus diawali sk-ant-). Cek env ANTHROPIC_API_KEY di Vercel.",
      "AI_KEY_FORMAT",
      500,
    );
  }

  let response;
  try {
    response = await getClient().beta.messages.parse({
      model,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      output_config: {
        effort: "low",
        format: betaZodOutputFormat(TaskDraftSchema),
      },
      messages: [{ role: "user", content: buildTaskDraftPrompt(input) }],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new TaskDraftError(
        "API key AI ditolak Anthropic (salah/dicabut). Buat key baru di console.anthropic.com lalu redeploy.",
        "AI_AUTH_FAILED",
        500,
      );
    }
    if (error instanceof Anthropic.PermissionDeniedError) {
      throw new TaskDraftError(
        "API key tidak punya akses ke model ini. Cek akun/saldo Anthropic atau isi ANTHROPIC_MODEL lain.",
        "AI_PERMISSION_DENIED",
        500,
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new TaskDraftError("AI sedang sibuk, coba lagi sebentar", "AI_RATE_LIMITED", 429);
    }
    if (error instanceof Anthropic.APIConnectionError) {
      throw new TaskDraftError("Tidak bisa menghubungi layanan AI", "AI_UNREACHABLE", 504);
    }
    if (error instanceof Anthropic.APIError) {
      throw new TaskDraftError(`Layanan AI error (${error.status})`, "AI_API_ERROR");
    }
    throw error;
  }

  if (response.stop_reason === "refusal") {
    throw new TaskDraftError("AI menolak permintaan ini. Tulis manual ya.", "AI_REFUSED", 422);
  }
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    throw new TaskDraftError("Jawaban AI tidak lengkap, coba lagi", "AI_INCOMPLETE");
  }

  const { task_title, task_description } = response.parsed_output;
  return {
    task_title: task_title.trim().slice(0, 120),
    task_description: task_description.trim(),
  };
}

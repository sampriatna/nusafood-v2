import * as z from "zod/v4";
import { runStructuredAi } from "@/lib/ai/task-draft";

/** Rapikan bahasa isi surat teguran/SP tanpa mengubah fakta. */

export const LetterPolishSchema = z.object({
  chronology: z.string(),
  violation_detail: z.string(),
  operational_impact: z.string(),
  correction_instruction: z.string(),
});

export type LetterPolish = z.infer<typeof LetterPolishSchema>;

export type LetterPolishInput = LetterPolish & {
  letter_type: "TEGURAN" | "PERINGATAN";
  employee_name?: string;
  task_title?: string;
  incident_date?: string;
};

const SYSTEM_PROMPT = `Anda editor dokumen HR untuk CV Nusantara Research Development (NF3), usaha F&B di Cirebon.
Tugas Anda: merapikan bahasa isi surat teguran / surat peringatan menjadi Bahasa Indonesia formal yang jelas, sopan, dan tegas.

Aturan WAJIB:
- JANGAN menambah, mengurangi, atau mengubah fakta: nama, tanggal, jam, nomor tugas, angka, lokasi, dan kejadian harus tetap sama.
- JANGAN mengarang kejadian, akibat, atau aturan yang tidak ada di teks asli.
- Jika teks sudah berupa kalimat formal yang baik, kembalikan apa adanya.
- Jika sebuah kolom kosong, kembalikan string kosong.
- Tanpa markdown, tanpa emoji, tanpa salam pembuka/penutup.
- Nada: profesional dan membina, tidak mengancam, tidak merendahkan.
- Panjang tiap kolom 1–3 kalimat; instruksi perbaikan boleh berupa daftar bernomor singkat bila aslinya berisi beberapa poin.
- Tanggal ditulis lengkap, mis. "27 Agustus 2026, pukul 21.05 WIB".`;

export function buildLetterPolishPrompt(input: LetterPolishInput): string {
  return [
    `Jenis surat: ${input.letter_type === "PERINGATAN" ? "Surat Peringatan" : "Surat Teguran"}`,
    input.employee_name ? `Nama karyawan: ${input.employee_name}` : "",
    input.task_title ? `Judul tugas terkait: ${input.task_title}` : "",
    input.incident_date ? `Tanggal surat: ${input.incident_date}` : "",
    "",
    "Rapikan kolom berikut:",
    `chronology (Kronologi): ${input.chronology || "(kosong)"}`,
    `violation_detail (Bentuk pelanggaran): ${input.violation_detail || "(kosong)"}`,
    `operational_impact (Dampak operasional): ${input.operational_impact || "(kosong)"}`,
    `correction_instruction (Instruksi perbaikan): ${input.correction_instruction || "(kosong)"}`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export async function polishLetterText(input: LetterPolishInput): Promise<LetterPolish> {
  const out = await runStructuredAi(SYSTEM_PROMPT, buildLetterPolishPrompt(input), LetterPolishSchema);
  // Kolom kosong di input tetap kosong (jangan biarkan AI mengisi sendiri).
  return {
    chronology: input.chronology.trim() ? out.chronology.trim() : "",
    violation_detail: input.violation_detail.trim() ? out.violation_detail.trim() : "",
    operational_impact: input.operational_impact.trim() ? out.operational_impact.trim() : "",
    correction_instruction: input.correction_instruction.trim()
      ? out.correction_instruction.trim()
      : "",
  };
}
